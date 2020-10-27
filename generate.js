const { Client } = require('ldapts');
const faker = require('faker');
const args = require('args');

args
  .option('url', 'The URL of the target LDAP server', 'ldaps://localhost:636')
  .option('basePath', 'The LDAP base path used in the directory', 'dc=example, dc=org')
  .option('bindUser', 'The DN of the bind user with write permissions', 'cn=admin,dc=example,dc=org')
  .option('bindPassword', 'The password of the bind user', 'admin')
  .option('numberOfSchools', 'The number of schools to create', 5)
  .option('numberOfUsers', 'The number of users to create (per school)', 100)
  .option('numberOfClasses', 'the number of classes to create (per school)', 10)

const options = args.parse(process.argv);

currentId = 0;
const getId = () => {
  currentId += 1;
  return currentId;
}

(async () => {


const client = new Client({
  url: options.url,
  timeout: 0,
  connectTimeout: 0,
  tlsOptions: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  },
  strictDN: true,
});

const createDirectory = async (name, base) => {
   await client.add(`ou=${name}, ${base ? base + ',' : ''} ${options.basePath}`, {
    objectClass: ['top', 'organizationalUnit'],
    ou: name,
  });
}

const createSchool = async (name, domain) => {
  const entry = {
    objectClass: ['top', 'organizationalUnit'],
    ou: domain,
    description: name,
  }
  await client.add(`ou=${domain}, ${options.basePath}`, entry);
}

const createGroup = async (name, members=[], base='ou=groups') => {
  const entry = {
    objectClass: ['top', 'posixGroup'],
    cn: name,
    gidNumber: `${getId()}`,
  }
  if (members.length > 0) {
    entry.memberUid = members;
  }
  await client.add(`cn=${name}, ${base ? base + ',' : ''} ${options.basePath}`, entry);
}

const createUser = async (person, base) => {
  const username = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}`;
  const entry = {
    cn: username,
    givenName: person.firstName,
    sn: person.lastName,
    uidNumber: `${person.id}`,
    gidNumber: `${person.id}`,
    homeDirectory: `/home/${username}/`,
    uid: username,
    mail: `${username}@example.org`,
    objectClass: ['person', 'inetOrgPerson', 'posixAccount'],
  };
  const dn = `uid=${username}, ou=users, ${base ? base + ',' : ''} ${options.basePath}`;
  await client.add(dn, entry);
  return dn;
}

try {

  await client.bind(options.bindUser, options.bindPassword);

  for (let schoolId = 0; schoolId < options.numberOfSchools; schoolId += 1) {
    const domain = `school${schoolId}.de`;
    const base = `ou=${domain}`;

    await createSchool(`LDAP Test School #${schoolId}`, domain);
    await Promise.all(['users', 'roles', 'groups'].map((dir) => createDirectory(dir, base)));

    const students = [];
    const teachers = [];
    const admins = [];
    const ignored = [];

    for (let i = 0; i < options.numberOfUsers; i += 1) {
      const dn = await createUser({
        id: getId(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
      }, base);
      const r = Math.random();
      if (r < 0.1 && admins.length < 10) { admins.push(dn); continue; }
      if (r < 0.1 && ignored.length < 10) { ignored.push(dn); continue; }
      if (r < 0.2) { teachers.push(dn); continue; }
      students.push(dn);
    }

    await Promise.all([
      createGroup('admins', admins, `ou=roles,${base}`),
      createGroup('teachers', teachers, `ou=roles,${base}`),
      createGroup('students', students, `ou=roles,${base}`),
      createGroup('ignored', ignored, `ou=roles,${base}`),
    ]);

    const classUsers = teachers.concat(teachers).concat(ignored);
    const randomUser = () => classUsers[Math.floor(Math.random() * classUsers.length)];
    for (let i = 0; i < options.numberOfClasses; i += 1) {
      const name = faker.company.catchPhrase();
      const members = new Set();
      const numberOfUsers = Math.floor(Math.random() * 20) + 5;
      for (let j = 0; j < numberOfUsers; j += 1) {
        members.add(randomUser());
      }
      await createGroup(name, Array.from(members), `ou=groups,${base}`);
    }
  }

} catch (err) {
  console.log(err);
} finally {
  await client.unbind();
}

})()
