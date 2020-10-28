const faker = require('faker');
const args = require('args');

args
  .option('basePath', 'The LDAP base path used in the directory', 'dc=example, dc=org')
  .option('numberOfSchools', 'The number of schools to create', 20)
  .option('numberOfUsers', 'The number of users to create (per school)', 1000)
  .option('numberOfClasses', 'the number of classes to create (per school)', 100)

const options = args.parse(process.argv);

currentId = 0;
const getId = () => {
  currentId += 1;
  return currentId;
}

const toLdif = ({ dn, changetype = 'add', ...attributes }) => {
  dn = dn.replace(/\s/g, '');
  let result = `dn: ${dn}\nchangetype: ${changetype}\n`;

  for (const [k, v] of Object.entries(attributes)) {
    if (Array.isArray(v)) {
      v.forEach((e) => result += `${k}: ${e}\n`)
    } else {
      result += `${k}: ${v}\n`;
    }
  };
  return result;
}

const output = (...args) => console.log(...args);
const outputLdif = (entity) => !!entity ? output(toLdif(entity)) : void 0;

const getDirectory = (name, base) => {
  const entry = {
    dn: `ou=${name}, ${base}`,
    objectClass: ['top', 'organizationalUnit'],
    ou: name,
  }
  return entry;
}

const getUser = (base) => {
  const id = getId();
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${id}`;
  const entry = {
    dn: `uid=${username}, ou=users, ${base}`,
    objectClass: ['top', 'person', 'inetOrgPerson', 'posixAccount', 'uuidObject'],
    cn: username,
    givenName: firstName,
    sn: lastName,
    uidNumber: `${id}`,
    gidNumber: `${id}`,
    homeDirectory: `/home/${username}/`,
    uid: username,
    mail: `${username}@example.org`,
    uuid: faker.random.uuid(),
  };
  return entry;
}

const getGroup = (name, members=[], directory, base) => {
  const entry = {
    dn: `cn=${name}, ${directory}, ${base}`,
    objectClass: ['top', 'groupOfNames'],
    cn: name,
  }
  if (members.length > 0) {
    entry.member = members;
    return entry;
  }
}

outputLdif({
  dn: 'dc=de,' + options.basePath,
  dc: 'de',
  objectClass: ['top', 'domain'],
})

for (let schoolId = 0; schoolId < options.numberOfSchools; schoolId += 1) {
  const schoolDn = `o=school${schoolId}, dc=de, ${options.basePath}`;

  const school = {
    dn: schoolDn,
    objectClass: ['top', 'organization'],
    o: `school${schoolId}.de`,
  };

  outputLdif(school);

  ['users', 'roles', 'groups'].map((dir) => getDirectory(dir, schoolDn)).forEach(outputLdif);

  const students = [];
  const teachers = [];
  const admins = [];
  const ignored = [];

  for (let i = 0; i < options.numberOfUsers; i += 1) {
    const user = getUser(schoolDn);
    outputLdif(user);
    const r = Math.random();
    if (r < 0.1 && admins.length < 10) { admins.push(user.dn); continue; }
    if (r < 0.1 && ignored.length < 10) { ignored.push(user.dn); continue; }
    if (r < 0.2) { teachers.push(user.dn); continue; }
    students.push(user.dn);
  }

  [
    getGroup('admins', admins, 'ou=roles', schoolDn),
    getGroup('teachers', teachers, 'ou=roles', schoolDn),
    getGroup('students', students, 'ou=roles', schoolDn),
    getGroup('ignored', ignored, 'ou=roles', schoolDn),
  ].forEach(outputLdif);

  const classUsers = teachers.concat(students).concat(ignored);
  const randomUser = () => classUsers[Math.floor(Math.random() * classUsers.length)];
  for (let i = 0; i < options.numberOfClasses; i += 1) {
    const name = faker.company.catchPhrase();
    const members = new Set();
    const numberOfUsers = Math.floor(Math.random() * 20) + 5;
    for (let j = 0; j < numberOfUsers; j += 1) {
      members.add(randomUser());
    }
    outputLdif(getGroup(name, Array.from(members), 'ou=groups', schoolDn));
  }
}
