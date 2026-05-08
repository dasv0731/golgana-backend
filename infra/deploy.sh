#!/usr/bin/env bash
# golgana-backend deploy script · cuenta de pruebas (polla)
#
# Crea/actualiza:
#  - 10 tablas DynamoDB
#  - Cognito User Pool + App Client
#  - IAM role + Lambda resolver (router AppSync → repos)
#  - AppSync GraphQL API + schema + 1 Lambda data source + resolvers por field
#  - API Key (queries públicas)
#  - S3 bucket + CloudFront para admin SPA
#
# Uso:
#   ./deploy.sh up           # crea/actualiza
#   ./deploy.sh status       # outputs actuales
#   ./deploy.sh build-admin  # ng build prod + S3 sync + CF invalidate
#   ./deploy.sh create-admin # crea usuario admin en Cognito
#   ./deploy.sh down         # destruye todo

set -euo pipefail

PROFILE="${AWS_PROFILE:-polla}"
REGION="${AWS_REGION:-us-east-1}"
PREFIX="gg"
STACK="golgana-test"
ROOT="$(cd "$(dirname "$0")/.." && (pwd -W 2>/dev/null || pwd))"
OUT="$ROOT/infra/outputs.env"

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

log()  { echo -e "\033[1;32m▸\033[0m $*"; }
warn() { echo -e "\033[1;33m!\033[0m $*"; }
die()  { echo -e "\033[1;31m✘\033[0m $*" >&2; exit 1; }

read_output() { grep -E "^$1=" "$OUT" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r'; }
write_output() {
  local key="$1" val="$2"
  mkdir -p "$(dirname "$OUT")"
  touch "$OUT"
  if grep -qE "^$key=" "$OUT" 2>/dev/null; then
    awk -v k="$key" -v v="$val" '$0 ~ "^"k"=" { print k"="v; next } { print }' "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
  else
    echo "$key=$val" >> "$OUT"
  fi
}

# ============================================================
# DynamoDB
# ============================================================
ensure_table_simple() {
  local name="$1"
  if aws dynamodb describe-table --table-name "$name" >/dev/null 2>&1; then return; fi
  log "creando tabla $name (PK slug)"
  aws dynamodb create-table \
    --table-name "$name" \
    --attribute-definitions AttributeName=slug,AttributeType=S \
    --key-schema AttributeName=slug,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=stack,Value=$STACK >/dev/null
}

ensure_table_plantillas() {
  local name="$PREFIX-plantillas"
  aws dynamodb describe-table --table-name "$name" >/dev/null 2>&1 && return
  log "creando tabla $name (PK equipoSlug)"
  aws dynamodb create-table --table-name "$name" \
    --attribute-definitions AttributeName=equipoSlug,AttributeType=S \
    --key-schema AttributeName=equipoSlug,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST --tags Key=stack,Value=$STACK >/dev/null
}

ensure_table_grupos() {
  local name="$PREFIX-grupos"
  aws dynamodb describe-table --table-name "$name" >/dev/null 2>&1 && return
  log "creando tabla $name (PK edicionSlug, SK slug)"
  aws dynamodb create-table --table-name "$name" \
    --attribute-definitions AttributeName=edicionSlug,AttributeType=S AttributeName=slug,AttributeType=S \
    --key-schema AttributeName=edicionSlug,KeyType=HASH AttributeName=slug,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST --tags Key=stack,Value=$STACK >/dev/null
}

ensure_table_subselecciones() {
  local name="$PREFIX-sub-selecciones"
  aws dynamodb describe-table --table-name "$name" >/dev/null 2>&1 && return
  log "creando tabla $name (PK equipoSlug, SK sub)"
  aws dynamodb create-table --table-name "$name" \
    --attribute-definitions AttributeName=equipoSlug,AttributeType=S AttributeName=sub,AttributeType=S \
    --key-schema AttributeName=equipoSlug,KeyType=HASH AttributeName=sub,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST --tags Key=stack,Value=$STACK >/dev/null
}

create_dynamo_tables() {
  log "DynamoDB · 10 tablas"
  for s in equipos jugadores partidos ediciones torneos temas noticias; do
    ensure_table_simple "$PREFIX-$s"
  done
  ensure_table_plantillas
  ensure_table_grupos
  ensure_table_subselecciones
  log "esperando ACTIVE…"
  for t in equipos jugadores partidos ediciones torneos temas noticias plantillas grupos sub-selecciones; do
    aws dynamodb wait table-exists --table-name "$PREFIX-$t"
  done
}

# ============================================================
# Cognito
# ============================================================
ensure_cognito() {
  local pool_id app_id
  pool_id="$(read_output COGNITO_USER_POOL_ID || true)"
  if [ -z "${pool_id:-}" ]; then
    log "Cognito · creando User Pool"
    pool_id="$(aws cognito-idp create-user-pool \
      --pool-name "$STACK-pool" \
      --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":false,"RequireNumbers":false,"RequireSymbols":false}}' \
      --auto-verified-attributes email \
      --username-attributes email \
      --admin-create-user-config '{"AllowAdminCreateUserOnly":true}' \
      --schema 'Name=email,Required=true,Mutable=true' \
      --user-pool-tags stack=$STACK \
      --query 'UserPool.Id' --output text)"
    write_output COGNITO_USER_POOL_ID "$pool_id"
  fi
  app_id="$(read_output COGNITO_APP_CLIENT_ID || true)"
  if [ -z "${app_id:-}" ]; then
    log "Cognito · creando App Client"
    app_id="$(aws cognito-idp create-user-pool-client \
      --user-pool-id "$pool_id" \
      --client-name "$STACK-client" \
      --no-generate-secret \
      --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
      --query 'UserPoolClient.ClientId' --output text)"
    write_output COGNITO_APP_CLIENT_ID "$app_id"
  fi
  log "Cognito pool=$pool_id client=$app_id"
}

create_admin_user() {
  local pool_id; pool_id="$(read_output COGNITO_USER_POOL_ID)"
  [ -z "$pool_id" ] && die "Pool no creado. Corre 'up' primero."
  read -p "Email: " email
  read -s -p "Password temporal: " password; echo
  aws cognito-idp admin-create-user \
    --user-pool-id "$pool_id" \
    --username "$email" \
    --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
    --temporary-password "$password" \
    --message-action SUPPRESS >/dev/null
  log "Usuario creado: $email"
}

# ============================================================
# IAM role + Lambda resolver
# ============================================================
ensure_lambda_role() {
  local name="$STACK-lambda-role"
  local arn
  arn="$(aws iam get-role --role-name "$name" --query 'Role.Arn' --output text 2>/dev/null || true)"
  if [ -z "${arn:-}" ] || [ "$arn" = "None" ]; then
    log "IAM · creando role $name"
    arn="$(aws iam create-role --role-name "$name" \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
      --tags Key=stack,Value=$STACK \
      --query 'Role.Arn' --output text)"
    aws iam attach-role-policy --role-name "$name" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    aws iam put-role-policy --role-name "$name" --policy-name dynamo-rw \
      --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:PutItem","dynamodb:DeleteItem","dynamodb:Query","dynamodb:Scan","dynamodb:BatchWriteItem","dynamodb:UpdateItem","dynamodb:DescribeTable"],"Resource":"*"}]}'
    log "esperando 8s propagación IAM…"
    sleep 8
  fi
  write_output LAMBDA_ROLE_ARN "$arn"
}

build_resolver_lambda() {
  log "build resolver Lambda"
  (cd "$ROOT" && npm run build:resolver --silent)
}

ensure_resolver_lambda() {
  local name="$STACK-resolver"
  local zip="$ROOT/dist-lambda-resolver/resolver.zip"
  local role; role="$(read_output LAMBDA_ROLE_ARN)"
  local pool_id; pool_id="$(read_output COGNITO_USER_POOL_ID)"

  if aws lambda get-function --function-name "$name" >/dev/null 2>&1; then
    log "Lambda $name · update code"
    aws lambda update-function-code --function-name "$name" --zip-file "fileb://$zip" >/dev/null
    aws lambda wait function-updated --function-name "$name"
    aws lambda update-function-configuration --function-name "$name" \
      --runtime nodejs20.x --handler handler.handler --timeout 15 --memory-size 256 \
      --environment "Variables={NODE_ENV=production,STORAGE_DRIVER=dynamo,DDB_TABLE_PREFIX=$PREFIX-,ADMIN_API_KEY=disabled,COGNITO_USER_POOL_ID=$pool_id,COGNITO_REGION=$REGION}" >/dev/null
    aws lambda wait function-updated --function-name "$name"
  else
    log "Lambda · creando $name"
    aws lambda create-function --function-name "$name" \
      --runtime nodejs20.x --handler handler.handler --timeout 15 --memory-size 256 \
      --role "$role" --zip-file "fileb://$zip" \
      --environment "Variables={NODE_ENV=production,STORAGE_DRIVER=dynamo,DDB_TABLE_PREFIX=$PREFIX-,ADMIN_API_KEY=disabled,COGNITO_USER_POOL_ID=$pool_id,COGNITO_REGION=$REGION}" \
      --tags stack=$STACK >/dev/null
    aws lambda wait function-active-v2 --function-name "$name"
  fi
  local fn_arn; fn_arn="$(aws lambda get-function --function-name "$name" --query 'Configuration.FunctionArn' --output text)"
  write_output LAMBDA_FN_NAME "$name"
  write_output LAMBDA_FN_ARN "$fn_arn"
}

# ============================================================
# AppSync
# ============================================================
ensure_appsync() {
  local api_id; api_id="$(read_output APPSYNC_API_ID || true)"
  local pool_id; pool_id="$(read_output COGNITO_USER_POOL_ID)"
  local app_id;  app_id="$(read_output COGNITO_APP_CLIENT_ID)"
  local fn_arn;  fn_arn="$(read_output LAMBDA_FN_ARN)"

  if [ -z "${api_id:-}" ]; then
    log "AppSync · creando GraphQL API"
    api_id="$(aws appsync create-graphql-api \
      --name "$STACK-graphql" \
      --authentication-type API_KEY \
      --additional-authentication-providers "[{\"authenticationType\":\"AMAZON_COGNITO_USER_POOLS\",\"userPoolConfig\":{\"userPoolId\":\"$pool_id\",\"awsRegion\":\"$REGION\",\"appIdClientRegex\":\"$app_id\"}}]" \
      --tags stack=$STACK \
      --query 'graphqlApi.apiId' --output text)"
    write_output APPSYNC_API_ID "$api_id"
  else
    log "AppSync API $api_id existe"
  fi

  # API Key (1 año) — solo crea si no hay una guardada
  local api_key; api_key="$(read_output APPSYNC_API_KEY || true)"
  if [ -z "${api_key:-}" ]; then
    log "AppSync · creando API key"
    local expires; expires=$(( $(date +%s) + 365*24*3600 ))
    api_key="$(aws appsync create-api-key --api-id "$api_id" --description "$STACK key" --expires "$expires" --query 'apiKey.id' --output text)"
    write_output APPSYNC_API_KEY "$api_key"
  fi

  # Subir schema
  log "AppSync · uploading schema"
  aws appsync start-schema-creation --api-id "$api_id" \
    --definition "fileb://$ROOT/infra/schema.graphql" >/dev/null
  while true; do
    local status; status="$(aws appsync get-schema-creation-status --api-id "$api_id" --query 'status' --output text)"
    [ "$status" = "SUCCESS" ] && break
    [ "$status" = "FAILED" ] && die "schema upload FAILED"
    sleep 2
  done

  # Data source (Lambda)
  local ds_name="lambda"
  if ! aws appsync get-data-source --api-id "$api_id" --name "$ds_name" >/dev/null 2>&1; then
    log "AppSync · creando data source $ds_name"
    # Service role para que AppSync invoke Lambda
    local service_role_arn
    service_role_arn="$(aws iam get-role --role-name "$STACK-appsync-role" --query 'Role.Arn' --output text 2>/dev/null || true)"
    if [ -z "${service_role_arn:-}" ] || [ "$service_role_arn" = "None" ]; then
      log "IAM · creando role $STACK-appsync-role"
      service_role_arn="$(aws iam create-role --role-name "$STACK-appsync-role" \
        --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"appsync.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
        --query 'Role.Arn' --output text)"
      aws iam put-role-policy --role-name "$STACK-appsync-role" --policy-name invoke-lambda \
        --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"lambda:InvokeFunction\",\"Resource\":\"$fn_arn\"}]}"
      sleep 8
    fi

    aws appsync create-data-source --api-id "$api_id" \
      --name "$ds_name" --type AWS_LAMBDA \
      --service-role-arn "$service_role_arn" \
      --lambda-config "lambdaFunctionArn=$fn_arn" >/dev/null
  fi

  # Resolvers (un mismo template VTL para todo)
  local req_tpl='{"version":"2017-02-28","operation":"Invoke","payload":{"fieldName":"$ctx.info.fieldName","parentTypeName":"$ctx.info.parentTypeName","arguments":$util.toJson($ctx.args),"identity":$util.toJson($ctx.identity)}}'
  local resp_tpl='$util.toJson($ctx.result)'

  upsert_resolver() {
    local type="$1" field="$2"
    if aws appsync get-resolver --api-id "$api_id" --type-name "$type" --field-name "$field" >/dev/null 2>&1; then
      aws appsync update-resolver --api-id "$api_id" --type-name "$type" --field-name "$field" \
        --data-source-name "$ds_name" \
        --request-mapping-template "$req_tpl" \
        --response-mapping-template "$resp_tpl" >/dev/null
    else
      aws appsync create-resolver --api-id "$api_id" --type-name "$type" --field-name "$field" \
        --data-source-name "$ds_name" \
        --request-mapping-template "$req_tpl" \
        --response-mapping-template "$resp_tpl" >/dev/null
    fi
  }

  log "AppSync · creando/actualizando resolvers (~30)"
  # Queries
  for f in selecciones seleccion plantilla subSeleccion jugadores jugador partidos partido calendarioByEdicion goleadoresByEdicion torneo edicion grupos grupo sedesByEdicion temas tema noticias noticia healthz; do
    upsert_resolver Query "$f"
  done
  # Mutations
  for f in upsertSeleccion deleteSeleccion upsertPlantilla deletePlantilla upsertSubSeleccion upsertJugador deleteJugador upsertPartido deletePartido upsertTorneo upsertEdicion deleteEdicion upsertGrupo deleteGrupo upsertTema deleteTema upsertNoticia deleteNoticia; do
    upsert_resolver Mutation "$f"
  done

  local endpoint; endpoint="$(aws appsync get-graphql-api --api-id "$api_id" --query 'graphqlApi.uris.GRAPHQL' --output text)"
  write_output APPSYNC_URL "$endpoint"
  log "AppSync GraphQL → $endpoint"
}

# ============================================================
# Admin S3 + CloudFront
# ============================================================
ensure_admin_bucket() {
  local bucket; bucket="$(read_output ADMIN_BUCKET || true)"
  if [ -z "${bucket:-}" ]; then
    local account_id; account_id="$(aws sts get-caller-identity --query Account --output text)"
    bucket="$STACK-admin-$account_id"
    log "S3 · creando bucket $bucket"
    if [ "$REGION" = "us-east-1" ]; then
      aws s3api create-bucket --bucket "$bucket" >/dev/null
    else
      aws s3api create-bucket --bucket "$bucket" --create-bucket-configuration LocationConstraint=$REGION >/dev/null
    fi
    aws s3api put-bucket-tagging --bucket "$bucket" --tagging "TagSet=[{Key=stack,Value=$STACK}]" >/dev/null
    aws s3api put-public-access-block --bucket "$bucket" \
      --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null
    write_output ADMIN_BUCKET "$bucket"
  fi
}

ensure_cloudfront() {
  local dist_id; dist_id="$(read_output CLOUDFRONT_ID || true)"
  local bucket; bucket="$(read_output ADMIN_BUCKET)"
  local account_id; account_id="$(aws sts get-caller-identity --query Account --output text)"

  if [ -z "${dist_id:-}" ]; then
    log "CloudFront · creando OAC + distribución"
    local oac_id
    oac_id="$(aws cloudfront create-origin-access-control \
      --origin-access-control-config "Name=$STACK-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
      --query 'OriginAccessControl.Id' --output text)"

    local config
    config=$(cat <<JSON
{
  "CallerReference": "$STACK-$(date +%s)",
  "Comment": "$STACK admin SPA",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": { "Quantity": 1, "Items": [{
    "Id": "s3-origin",
    "DomainName": "$bucket.s3.$REGION.amazonaws.com",
    "OriginAccessControlId": "$oac_id",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  },
  "CustomErrorResponses": { "Quantity": 1, "Items": [{ "ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10 }]},
  "PriceClass": "PriceClass_100",
  "ViewerCertificate": { "CloudFrontDefaultCertificate": true }
}
JSON
)
    dist_id="$(aws cloudfront create-distribution --distribution-config "$config" --query 'Distribution.Id' --output text)"
    write_output CLOUDFRONT_ID "$dist_id"

    local policy
    policy=$(cat <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"cloudfront.amazonaws.com"},"Action":"s3:GetObject","Resource":"arn:aws:s3:::$bucket/*","Condition":{"StringEquals":{"AWS:SourceArn":"arn:aws:cloudfront::$account_id:distribution/$dist_id"}}}]}
JSON
)
    aws s3api put-bucket-policy --bucket "$bucket" --policy "$policy" >/dev/null
  fi

  local domain; domain="$(aws cloudfront get-distribution --id "$dist_id" --query 'Distribution.DomainName' --output text)"
  write_output ADMIN_URL "https://$domain"
}

# ============================================================
# Build & upload admin SPA
# ============================================================
build_and_upload_admin() {
  local bucket; bucket="$(read_output ADMIN_BUCKET)"
  local dist_id; dist_id="$(read_output CLOUDFRONT_ID)"
  local appsync_url; appsync_url="$(read_output APPSYNC_URL)"
  local api_key; api_key="$(read_output APPSYNC_API_KEY)"
  local pool_id; pool_id="$(read_output COGNITO_USER_POOL_ID)"
  local app_id;  app_id="$(read_output COGNITO_APP_CLIENT_ID)"

  log "rellenando environment.prod.ts"
  cat > "$ROOT/admin/src/environments/environment.prod.ts" <<TS
export const environment = {
  production: true,
  apiUrl: '',
  appsyncUrl: '$appsync_url',
  appsyncApiKey: '$api_key',
  cognito: {
    userPoolId: '$pool_id',
    clientId: '$app_id',
    region: '$REGION',
  },
};
TS

  log "ng build production"
  (cd "$ROOT/admin" && npx ng build --configuration=production)

  log "subiendo a S3"
  aws s3 sync "$ROOT/admin/dist/golgana-admin/browser/" "s3://$bucket/" --delete

  log "invalidando CloudFront"
  aws cloudfront create-invalidation --distribution-id "$dist_id" --paths '/*' >/dev/null
}

# ============================================================
# Down
# ============================================================
destroy_all() {
  warn "Esto BORRA: 10 tablas Dynamo, User Pool, Lambda, AppSync API, S3 bucket, CloudFront, IAM roles."
  read -p "Confirmar (escribe 'destruir'): " ans
  [ "$ans" = "destruir" ] || die "abortado"

  local api_id;   api_id="$(read_output APPSYNC_API_ID || true)"
  local dist_id;  dist_id="$(read_output CLOUDFRONT_ID || true)"
  local bucket;   bucket="$(read_output ADMIN_BUCKET || true)"
  local fn_name;  fn_name="$(read_output LAMBDA_FN_NAME || true)"
  local pool_id;  pool_id="$(read_output COGNITO_USER_POOL_ID || true)"

  [ -n "${api_id:-}" ] && { log "borrando AppSync $api_id"; aws appsync delete-graphql-api --api-id "$api_id" >/dev/null 2>&1 || true; }

  if [ -n "${dist_id:-}" ]; then
    warn "CloudFront $dist_id necesita disable+wait+delete (~15min). Hazlo manual:"
    warn "  aws cloudfront get-distribution-config --id $dist_id > /tmp/cf.json"
    warn "  # Edita Enabled:false, luego update-distribution, espera 'Deployed', luego delete-distribution"
  fi
  [ -n "${bucket:-}" ] && { log "vaciando+borrando bucket $bucket"; aws s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true; aws s3api delete-bucket --bucket "$bucket" >/dev/null 2>&1 || true; }
  [ -n "${fn_name:-}" ] && { log "borrando Lambda $fn_name"; aws lambda delete-function --function-name "$fn_name" >/dev/null 2>&1 || true; }
  [ -n "${pool_id:-}" ] && { log "borrando User Pool $pool_id"; aws cognito-idp delete-user-pool --user-pool-id "$pool_id" >/dev/null 2>&1 || true; }

  for role in "$STACK-lambda-role" "$STACK-appsync-role"; do
    log "borrando IAM role $role"
    for p in $(aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || true); do
      aws iam detach-role-policy --role-name "$role" --policy-arn "$p" >/dev/null 2>&1 || true
    done
    for p in $(aws iam list-role-policies --role-name "$role" --query 'PolicyNames' --output text 2>/dev/null || true); do
      aws iam delete-role-policy --role-name "$role" --policy-name "$p" >/dev/null 2>&1 || true
    done
    aws iam delete-role --role-name "$role" >/dev/null 2>&1 || true
  done

  for t in equipos jugadores partidos ediciones torneos temas noticias plantillas grupos sub-selecciones; do
    log "borrando tabla $PREFIX-$t"
    aws dynamodb delete-table --table-name "$PREFIX-$t" >/dev/null 2>&1 || true
  done

  rm -f "$OUT"
  log "down completo."
}

# ============================================================
# main
# ============================================================
case "${1:-up}" in
  up)
    create_dynamo_tables
    ensure_cognito
    ensure_lambda_role
    build_resolver_lambda
    ensure_resolver_lambda
    ensure_appsync
    ensure_admin_bucket
    ensure_cloudfront
    log "── outputs ──"
    cat "$OUT"
    log ""
    log "Próximos pasos:"
    log "  1) ./infra/deploy.sh create-admin"
    log "  2) STORAGE_DRIVER=dynamo npm run seed:dynamo"
    log "  3) ./infra/deploy.sh build-admin"
    ;;
  build-admin)  build_and_upload_admin ;;
  status)       [ -f "$OUT" ] && cat "$OUT" || echo "(sin outputs)" ;;
  create-admin) create_admin_user ;;
  down)         destroy_all ;;
  *) die "Uso: $0 {up|build-admin|status|create-admin|down}" ;;
esac
