# AQL BUILDER WRITTEN BY BETTER AND ADAPTED BY SASURFER (@GITHUB)
_WARNING: for EHRBase versions < 2.5.0 use release 1.0.0. Use latest version for EHRBase version >= 2.14.0 . No version available for 2.5.0<= EHRBase version<2.14.0__

 This sofware helps in building openEHR aql queries. It needs a running instance of EHRBase in order to work. Its main capabilities are: creating the query with autocompletion and template visualization, saving queries on the running instance of EHRBase (called views) or locally (called snippets), performing queries, retrieving and showing the results, importing (writing into EHRBase) templates. More info at [aql builder site]( https://docs.better.care/studio/aql-builder/overview ).

At login are asked: Username, Password, Platform URL. If oauth2 is configured (see below on how to do it) then the client_secret is also requested. The platform URL has the form http://{yourehrbaseservername}:{yourehrbaseserverport}/ehrbase

NOTE: It is necessary to login with the EHRBase admin credentials to let all template and views methods work as intended.

Example of values for the default credentials:
- Username: ehrbase-admin
- Password: EvenMoreSecretPassword
- Platform URL: http://localhost:8080/ehrbase


## INSTALL LOCALLY 
Conda is optional. You can install with or without it.

Clone the repository:
```
git clone https://github.com/sasurfer/aqlbetter.git
```
creates, optionally, a conda environment and install nodejs and run install and build scripts:
```
cd aqlbetter
conda create --name aqlbetter
conda activate aqlbetter
conda install -c conda-forge nodejs
npm install -g @angular/cli@10.1.0
cd projects/aql-builder/
npm install --save-dev @angular-devkit/build-angular --force
export NODE_OPTIONS=--openssl-legacy-provider
ng build aql-builder --prod
```

## COMMON CONFIGURATION
Modify 'localhost:8080' in projects/aql-builder/src/proxy.conf.json with {youehrbaseservername}:{yourehrbaseserverport}. 
This step, though optional, ensures that the app uses the EHRBase nodename, e.g., local.ehrbase.org, to create the full name for the queries. If the server in proxy is not recognized a default nodename will be used instead. 

## RUN WITH BASIC AUTH

### EHRBASE CONFIGURATION
In the EHRBase directory creates two files: .env.ehrbase and docker-compose.yml

This is an example of .env.ehrbase (read by docker-compose.yaml):
```
SERVER_NODENAME=local.ehrbase.org
SECURITY_AUTHTYPE=BASIC
SECURITY_AUTHUSER=ehrbase-user
SECURITY_AUTHPASSWORD=SuperSecretPassword
SECURITY_AUTHADMINUSER=ehrbase-admin
SECURITY_AUTHADMINPASSWORD=EvenMoreSecretPassword
SECURITY_OAUTH2USERROLE=USER
SECURITY_OAUTH2ADMINROLE=ADMIN
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUERURI=
MANAGEMENT_ENDPOINTS_WEB_EXPOSURE=env,health,info,metrics,prometheus
MANAGEMENT_ENDPOINTS_WEB_BASEPATH=/management
MANAGEMENT_ENDPOINT_ENV_ENABLED=true
MANAGEMENT_ENDPOINT_HEALTH_ENABLED=true
MANAGEMENT_ENDPOINT_HEALTH_DATASOURCE_ENABLED=true
MANAGEMENT_ENDPOINT_INFO_ENABLED=true
MANAGEMENT_ENDPOINT_METRICS_ENABLED=true
MANAGEMENT_ENDPOINT_PROMETHEUS_ENABLED=FALSE
MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED=true
MANAGEMENT_ENDPOINT_ENV_SHOWVALUES=ALWAYS
SYSTEM_ALLOW_TEMPLATE_OVERWRITE=true
ADMIN_API_ACTIVE=true
CACHE_ENABLED=true
ADMINAPI_ALLOWDELETEALL=true
WEB_CORS_ALLOWEDORIGINS=http://localhost:4201
WEB_CORS_ALLOWEDORIGINPATTERNS=http://*.localhost:4201
WEB_CORS_ALLOWEDMETHODS=GET,PUT,DELETE,POST,OPTIONS,HEAD
WEB_CORS_ALLOWCREDENTIALS=true
WEB_CORS_ALLOWEDHEADERS=*
```
and the related docker-compose.yml:
```
version: '3'

#
# Minimal setup for a running EHRbase. Contains the server component as well as the required postgres instance.
#
services:

  #
  # EHRBase container. see `.env.ehrbase` for configuration details.
  #
  ehrbase:
    image: ${EHRBASE_IMAGE:-ehrbase/ehrbase:2.6.0}
    env_file:
      - .env.ehrbase
    environment:
      DB_URL: jdbc:postgresql://ehrdb:5432/ehrbase
      DB_USER_ADMIN: ehrbase
      DB_PASS_ADMIN: ehrbase
      DB_USER: ehrbase_restricted
      DB_PASS: ehrbase_restricted
    links:
      - ehrdb
    depends_on:
      ehrdb:
        condition: service_healthy
    ports:
      - "8080:8080"
    networks:
      - ehrbase-net

  #
  # Pre-configured ehrbase postgres.
  #
  ehrdb:
    image: ${EHRBASE_POSTGRES_IMAGE:-ehrbase/ehrbase-v2-postgres:16.2}
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      EHRBASE_USER_ADMIN: ehrbase
      EHRBASE_PASSWORD_ADMIN: ehrbase
      EHRBASE_USER: ehrbase_restricted
      EHRBASE_PASSWORD: ehrbase_restricted
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres" ]
      interval: 5s
      timeout: 5s
      retries: 12
    ports:
      - "5432:5432"
    networks:
      - ehrbase-net
    volumes:
      - ./.pgdata:/var/lib/postgresql/data      
networks:
  ehrbase-net: { }
```
Start the services:
```
docker compose up 
```
### AQLBETTER CONFIGURATION
Make sure to use {aqlbetter_dir}/projects/aql-builder/src/environments/environment.prod.ts.BASICAUTH
From the dir {aqlbetter_dir}/projects/aql-builder:
```
cp ./src/environments/environment.prod.ts.BASICAUTH ./src/environments/environment.prod.ts

```
Remember to rerun the build step:
```
ng build aql-builder --prod
```
### RUN
Run with:
```
ng serve aql-builder --port 4201
```
Open a browser tab to localhost:4201, fill the credentials and click "Start querying data".

## OAUTH2
### EHRBASE CONFIGURATION
Create a directory for EHRBase and copy the following two example files.

This is an example of .env.ehrbase (read by docker compose yaml):
```
SERVER_NODENAME=local.ehrbase.org
SECURITY_AUTHTYPE=OAUTH
SECURITY_AUTHUSER=ehrbase-user
SECURITY_AUTHPASSWORD=SuperSecretPassword
SECURITY_AUTHADMINUSER=ehrbase-admin
SECURITY_AUTHADMINPASSWORD=EvenMoreSecretPassword
SECURITY_OAUTH2USERROLE=USER
SECURITY_OAUTH2ADMINROLE=ADMIN
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUERURI=http://172.31.0.2:8080/auth/realms/ehrbase
MANAGEMENT_ENDPOINTS_WEB_EXPOSURE=env,health,info,metrics,prometheus
MANAGEMENT_ENDPOINTS_WEB_BASEPATH=/management
MANAGEMENT_ENDPOINT_ENV_ENABLED=true
MANAGEMENT_ENDPOINT_HEALTH_ENABLED=true
MANAGEMENT_ENDPOINT_HEALTH_DATASOURCE_ENABLED=true
MANAGEMENT_ENDPOINT_INFO_ENABLED=true
MANAGEMENT_ENDPOINT_METRICS_ENABLED=true
MANAGEMENT_ENDPOINT_PROMETHEUS_ENABLED=FALSE
MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED=true
MANAGEMENT_ENDPOINT_ENV_SHOWVALUES=ALWAYS
SYSTEM_ALLOW_TEMPLATE_OVERWRITE=true
ADMIN_API_ACTIVE=true
CACHE_ENABLED=true
ADMINAPI_ALLOWDELETEALL=true
WEB_CORS_ALLOWEDORIGINS=http://localhost:4201
WEB_CORS_ALLOWEDORIGINPATTERNS=http://*.localhost:4201
WEB_CORS_ALLOWEDMETHODS=GET,PUT,DELETE,POST,OPTIONS,HEAD
WEB_CORS_ALLOWCREDENTIALS=true
WEB_CORS_ALLOWEDHEADERS=*
```
and the docker-compose.yml:
```
version: '3'

#
# Minimal setup for a running EHRbase. Contains the server component as well as the required postgres instance.
#
services:

  #
  # EHRBase container. see `.env.ehrbase` for configuration details.
  #
  ehrbase:
    image: ${EHRBASE_IMAGE:-ehrbase/ehrbase:2.6.0}
    env_file:
      - .env.ehrbase
    environment:
      DB_URL: jdbc:postgresql://ehrdb:5432/ehrbase
      DB_USER_ADMIN: ehrbase
      DB_PASS_ADMIN: ehrbase
      DB_USER: ehrbase_restricted
      DB_PASS: ehrbase_restricted
    links:
      - ehrdb
      - keycloak3
    depends_on:
      ehrdb:
        condition: service_healthy
      keycloak3:
        condition: service_started
    ports:
      - "8080:8080"
    networks:
      - ehrbase-net

  #
  # Pre-configured ehrbase postgres.
  #
  ehrdb:
    image: ${EHRBASE_POSTGRES_IMAGE:-ehrbase/ehrbase-v2-postgres:16.2}
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      EHRBASE_USER_ADMIN: ehrbase
      EHRBASE_PASSWORD_ADMIN: ehrbase
      EHRBASE_USER: ehrbase_restricted
      EHRBASE_PASSWORD: ehrbase_restricted
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres" ]
      interval: 5s
      timeout: 5s
      retries: 12
    ports:
      - "5432:5432"
    networks:
      - ehrbase-net
    volumes:
      - ./.pgdata:/var/lib/postgresql/data      

  keycloak3:
    image: quay.io/keycloak/keycloak:24.0.3
    #image: registry.vitasystems.dev/docker-registry/keycloak-x:0.9.9
    container_name: keycloak3
    command: "start-dev --import-realm"
    ports:
      - "8081:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_HTTP_RELATIVE_PATH: /auth
      KC_HTTP_PORT: 8080
    volumes:
      - ./tests/keycloak/import:/opt/keycloak/data/import
    networks:
      - ehrbase-net

networks:
  ehrbase-net: { }
```
from the latest https://github.com/ehrbase/ehrbase.git copy the path to the file (included) tests/keycloak/import/ehrbase-realm-exported.json to this directory.

Modify the SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUERURI server and port with your keycloak ip and port.

Start the services:
```
docker compose up 
```

### AQLBETTER CONFIGURATION
Use {aqlbetter_dir}/projects/aql-builder/src/environments/environment.prod.ts.OAUTH2 and modify the authorizationUrl according to your installation of keycloak. Remember that the address (server:port) must be the same as the one given in SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUERURI in the EHRBase settings (172.31.0.2:8080 in the example).
Rerun the build step:
```
ng build aql-builder --prod
```
### KEYCLOAK
Open a browser tab to localhost:8081/auth/admin and login to keycloak (admin/admin). Create, inside the ehrbase realm, a client named aqlbetter with client_id=aqlbetter, the urls set to http://localhost:4201 and Authentication and OAuth 2.0 Device Authorization Grant flagged on, choose client_id and client_secret as credentials and copy the newly created client_secret. Reset the ehrbase-admin password and copy it. client_secret and password for ehrbase-admin will be needed for the login form. 

### RUN
Run with:
```
ng serve aql-builder --port 4201 --prod
```
Open a browser tab to localhost:4201, fill the credentials and click "Start querying data".

## Acknowledgments
This work has been partially funded by the “Total Patient Management” (ToPMa) project (grant by the Sardinian Regional Authority, grant number RC_CRP_077).



# ORIGINAL README FROM BETTER FOLLOWS

# Better UI components

![Lint all packages](https://github.com/better-care/better-ui-components/workflows/Lint%20all%20packages/badge.svg)
![Test all packages](https://github.com/better-care/better-ui-components/workflows/Test%20all%20packages/badge.svg)

**Better UI Components** is an Angular UI workspace consisting of libraries and tools to easily adopt openEHR concepts to your own projects. 

It is based on Angular(10+) framework.

## Using the libraries

### AQL Builder

AQL builder is standalone full-featured application written in Angular (10+) for writing, executing [AQL queries](https://specifications.openehr.org/releases/QUERY/latest/AQL.html) for clinical data and outputting results.

For detailed instructions on setting up and using the application see the AQL Builder [README.md](/projects/aql-builder/README.md)

### AQL result table

To install this library run:

```
npm install @bettercare/aql-result-table
```

Once you have installed the library, include library to your project module:

```typescript
 @NgModule({
   imports: [
     ...
     AqlResultTableModule
   ],
   bootstrap: [AppComponent]
 })
 
 export class AppModule {
 }
```

Then you can simply use it in your component `html` and provide input data:

```html
<bui-aql-result-table
    [aqlResultMetadata]="aqlResultMetadata"
    [tablePresentation]="tablePresentation">
</bui-aql-result-table>
```

_* `tablePresentation` input is optional and is by default set to `COMPACT` view_

#### Input models
```typescript
class AqlResultMetadata {
  aql?: string;
  executedAql: string;
  meta?: {href: string};
  resultSet: unknown[] = [];
}

enum TablePresentation {
  DETAILED = 'DETAILED',
  COMPACT = 'COMPACT'
}
```

## Trying out demo app

Simply run dev server `ng serve` and you are good to go.

### Specifying server

If you have access to EHR platform, you can also specify platform url and credentials in `AppComponent`.

```typescript
  serverConfig = {
    url: undefined, // 'https://MY-EHR-PLATFORM/rest/v1/query',
    username: undefined, // 'MY_USERNAME',
    pwd: undefined, // 'MY_PWD'
  };
```

In this case you will be able to write and execute your custom AQLs. Results will be immediately shown in the table. 

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Contributing

See our [CONTRIBUTING.md](/CONTRIBUTING.md) guide

## Licence

Feel free to use our library in your commercial and private applications

All Better UI component packages are covered by [Apache 2.0](/LICENSE)

Read more about this license [here](https://choosealicense.com/licenses/apache-2.0/)

