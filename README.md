# ldap-test-tools

## Generate user data on an LDAP server
`npm i && node generate.js [options]`

```
node generate.js --help   
  Usage: generate.js [options] [command]
  
  Commands:
    help     Display help
    version  Display version
  
  Options:
    --basePath [value]      The LDAP base path used in the directory (defaults to "dc=example, dc=org")
    --bindPassword [value]  The password of the bind user (defaults to "admin")
    --bindUser [value]      The DN of the bind user with write permissions (defaults to "cn=admin,dc=example,dc=org")
    --help                  Output usage information
    --numberOfClasses <n>   the number of classes to create (per school) (defaults to 10)
    --numberOfSchools <n>   The number of schools to create (defaults to 5)
    --numberOfUsers <n>     The number of users to create (per school) (defaults to 100)
    --url [value]           The URL of the target LDAP server (defaults to "ldaps://localhost:636")
    --version               Output the version number
```

## Generate user data as LDIF
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
