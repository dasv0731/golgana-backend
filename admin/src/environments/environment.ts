export const environment = {
  production: false,
  // Dev local: el admin habla con el backend Hono REST en :3001.
  apiUrl: 'http://localhost:3001',
  // Vacíos en dev → la ApiService usa el path REST. Cuando se rellenan, usa GraphQL.
  appsyncUrl: '',
  appsyncApiKey: '',
  cognito: null as null | {
    userPoolId: string;
    clientId: string;
    region: string;
  },
};
