// Estos valores los rellena infra/deploy.sh build-admin con sustitución de placeholders.
// NO commitear con valores reales — son específicos del deploy.
export const environment = {
  production: true,
  apiUrl: '',
  appsyncUrl: '__APPSYNC_URL__',
  appsyncApiKey: '__APPSYNC_API_KEY__',
  cognito: {
    userPoolId: '__USER_POOL_ID__',
    clientId: '__APP_CLIENT_ID__',
    region: '__REGION__',
  },
};
