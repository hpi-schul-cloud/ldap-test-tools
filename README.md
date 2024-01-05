# ldap-test-tools

1. [Generate user data as LDIF](#generate-user-data-as-ldif)
2. [Startup with docker-compose](#startup-with-docker-compose)
3. [Build a container with pre-filled database](#build-a-container-with-pre-filled-database)

## Generate user data as LDIF

Data in LDIF format can be used to seed an LDAP server.

`npm i && node generateLdif.js`

This prints the LDIF directly to stdout. Run `node generateLdif.js > export.ldif` to pipe it into a file.

```
node generateLdif.js --help
  Usage: generateLdif.js [options] [command]

  Commands:
    help     Display help
    version  Display version

  Options:
    --basePath [value]     The LDAP base path used in the directory (defaults to "dc=example, dc=org")
    --help                 Output usage information
    --numberOfClasses <n>  the number of classes to create (per school) (defaults to 100)
    --numberOfSchools <n>  The number of schools to create (defaults to 20)
    --numberOfUsers <n>    The number of users to create (per school) (defaults to 1000)
    --version              Output the version number
```

## Startup with docker-compose

> Startup of the docker container can take a while, because of the amount of data it has to write to the database

Run `docker-compose up -d` to startup a OpenLDAP server with sample data to use with Schulcloud-Server.
The docker-compose file also sets up a phpLDAPAdmin which is reachable via `http://localhost:8080`.

To Login use as user `cn=admin,dc=example,dc=org`, default password is `admin`
The LDAP container is reachable via port `389`and `636`.

## Build a container

### Pre-filled database

Run `docker build -t myopenldap .` to create a new docker image with pre-filled data. This saves time at startup, but already runs the first steps like set of the admin password, so they cannot be changed later.

The default admin password is `admin`. To change it, run the build command with arg `LDAP_ADMIN_PASSWORD`: `docker build --build-arg LDAP_ADMIN_PASSWORD=Donky -t myopenldap .`

### Generate new data at build

> The data in the container will be differnt at each run

The build supports different arg, that allow to change the data at build time. To build a conatiner with different data you have to set `--build-arg` (e.g. `docker build --build-arg GENERATE_DATA=true --build-arg NUMBER_OF_SCHOOLS=300 -t myopenldap .`). You will find all supported args in the Dockerfile.


### Export structure

The LDAP entities are compatible with the `general`, `iserv`, and `iserv-idm` providers used by the schulcloud-server.
The basic structure looks like this:

![export structure](./docs/export_structure.png)

On the base path level, the script will create a container `dc=de`, which contains all schools. This emulates the domain handling of the central IServ. When connecting to a server seeded with this data using the `general` or `iserv` strategies, instead of `dc=example,dc=org`, use `o=school0,dc=de,dc=example,dc=org` as base path, to isolate a specific school.

Each school has all users organized in the `ou=users` directory. `ou=roles` contains the five roles `ROLE_ADMIN`, `ROLE_TEACHER`, `ROLE_SUBSTITUTE_TEACHER`, `ROLE_STUDENT` (does not exist in `iserv` and `iserv-idm`, but is necessary for `general`), and `ROLE_NBC_EXCLUDE` (users who should not be synced). `ou=groups` contains classes, which are constructed with random users (teachers, students, excluded users).

### Seeding a server

The data can be used as-is with a server that already has the configured base path nodes. All other nodes will be created in the import process and must not be present.
To successfully import uuids, the [uuid schema](./schema/uuid.schema) must be imported before importing the generated LDIF. For `memberOf` (required for roles via group membership), the [memberOf overlay](https://www.adimian.com/blog/2014/10/how-to-enable-memberof-using-openldap/) must be active for the `member` attribute on `groupOfNames` nodes on the server before importing the groups.


### Necessary Environment Variables
You need to have RabbitMQ installed on your machine or running in docker (as you need for automated tests in the server).<br>
You need to activate RabbitMQ and activate the message consumers for the syncer.<br>
The passwords to search any LDAPs for users are encrypted. You need to set your encryption key.<br>

So you need the following configuration in you .env file. (Default values that are probably working for you)

```
FEATURE_RABBITMQ_ENABLED=true
RABBITMQ_URI=amqp://guest:guest@localhost:5672
FEATURE_SYNCER_CONSUMER_ENABLE=true
LDAP_PASSWORD_ENCRYPTION_KEY= <a key of your choice>
```

### Creating an LDAP configuration

Further down you will find two configurations you can use for the LDAP sync. You can add those configurations to the 'system' collection. There is one config for the iserv strategy (for multiple schools) and one config for a single school. Choose the scenario you need or both<br>
Before adding the configuration in you database you need to replace the `searchUserPassword` by the LDAP's password (default 'admin') encrypted with the `LDAP_PASSWORD_ENCRYPTION_KEY` that you set in your local .env file.<br>
This repo contains a script to encrypt the secret. Usage is <br>
`node encrypt.js -e <password> -s <encryption-key>`

**Remember to adapt the base path to your chosen base and replace the URL and port.** Don't use `ldaps://` with a self-signed certificate.

**iserv-idm**
```json
{
    "type" : "ldap",
    "alias" : "Fake-IServ",
    "ldapConfig" : {
        "provider" : "iserv-idm",
        "url" : "ldap://127.0.0.1:389",
        "rootPath" : "dc=de,dc=example,dc=org",
        "searchUser" : "cn=admin,dc=example,dc=org",
        "searchUserPassword" : "U2FsdGVkX18OoIinJA2yeskAPGLFqcb0ArdCNoouRrY=",
        "active" : true
    }
}
```

**general**
```json
{
	"ldapConfig": {
		"active": true,
		"url": "ldap://127.0.0.1:389",
		"rootPath": "o=school0,dc=de,dc=example,dc=org",
		"searchUser": "cn=admin,dc=example,dc=org",
		"searchUserPassword": "U2FsdGVkX18OoIinJA2yeskAPGLFqcb0ArdCNoouRrY=",
		"provider": "general",
		"providerOptions": {
			"schoolName": "Generated School 0",
			"userPathAdditions": "ou=users",
			"classPathAdditions": "ou=groups",
			"roleType": "group",
			"userAttributeNameMapping": {
				"givenName": "givenName",
				"sn": "sn",
				"dn": "dn",
				"uuid": "uuid",
				"uid": "uid",
				"mail": "mail",
				"role": "description"
			},
			"roleAttributeNameMapping": {
				"roleStudent": "cn=ROLE_STUDENT,ou=roles,o=school0,dc=de,dc=example,dc=org",
				"roleTeacher": "cn=ROLE_TEACHER,ou=roles,o=school0,dc=de,dc=example,dc=org;;cn=ROLE_SUBSTITUTE_TEACHER,ou=roles,o=school0,dc=de,dc=example,dc=org",
				"roleAdmin": "cn=ROLE_ADMIN,ou=roles,o=school0,dc=de,dc=example,dc=org",
				"roleNoSc": "cn=ROLE_NBC_EXCLUDE,ou=roles,o=school0,dc=de,dc=example,dc=org"
			},
			"classAttributeNameMapping": {
				"description": "description",
				"dn": "dn",
				"uniqueMember": "member"
			}
		}
	},
	"type": "ldap",
	"alias": "LDAP Integration"
}
```

To trigger the LDAP sync call `127.0.0.1:3030/sync?target=ldap`. For this call to be authorized you need to set the header `x-api-key` with the value you configured in the var `SYNC_API_KEY`. Default for `SYNC_API_KEY`is 'example'
