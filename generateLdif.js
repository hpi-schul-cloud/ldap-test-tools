const faker = require('faker');
const args = require('args');

args
  .option('basePath', 'The LDAP base path used in the directory', 'dc=example, dc=org')
  .option('numberOfSchools', 'The number of schools to create', 20)
  .option('numberOfUsers', 'The number of users to create (per school)', 1000)
  .option('numberOfClasses', 'the number of classes to create (per school)', 100)
  .option('percentageOfCollision', 'rate of reuse a user uuid', 0)

const options = args.parse(process.argv);


(function validateOptions() {

  // Source: https://stackoverflow.com/questions/9289357/javascript-regular-expression-for-dn
  const regexForLdapValidation = /^(?:[A-Za-z][\w-]*|\d+(?:\.\d+)*)=(?:#(?:[\dA-Fa-f]{2})+|(?:[^,=\+<>#;\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*|"(?:[^\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*")(?:\+(?:[A-Za-z][\w-]*|\d+(?:\.\d+)*)=(?:#(?:[\dA-Fa-f]{2})+|(?:[^,=\+<>#;\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*|"(?:[^\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*"))*(?:(,|;;)(?:[A-Za-z][\w-]*|\d+(?:\.\d+)*)=(?:#(?:[\dA-Fa-f]{2})+|(?:[^,=\+<>#;\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*|"(?:[^\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*")(?:\+(?:[A-Za-z][\w-]*|\d+(?:\.\d+)*)=(?:#(?:[\dA-Fa-f]{2})+|(?:[^,=\+<>#;\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*|"(?:[^\\"]|\\[,=\+<>#;\\"]|\\[\dA-Fa-f]{2})*"))*)*$/

  // test ldap dns
  const ldapDnOptions = ['basePath'];
  ldapDnOptions.forEach((optionName) => {
    if(options[optionName]){
      const value = options[optionName];
      if(regexForLdapValidation.test(value)) throw new Error(`Value of --${optionName} is no valid ldap dn`)
    }
  })

  // simple test numbers and if they are greater as 0
  const numberOptions = ['numberOfSchools', 'numberOfUsers', 'numberOfClasses'];
  numberOptions.forEach((optionName) => {
    if(options[optionName]){
      const value = Number(options[optionName]);
      if(value < 0) throw new Error(`Value of --${optionName} must be a non-negative number`)

    }
  })

  // check percentage for range
  const percentageOptions = ['percentageOfCollision'];
  percentageOptions.forEach((optionName) => {
    if(options[optionName]){
      const value = Number(options[optionName]);
      if(value < 0 || value > 100) throw new Error(`Value of --${optionName} is a percentage value and have to be in the range of 0 and 100 (including 0 and 100)`)
    }
  })
})()

currentId = 0;
const getId = () => {
  currentId += 1;
  return currentId;
}

/////////////////
/// uuid pool
/////////////////
const uuidPool = [];
const usedUuids = [];
(function generateUuid() {
  const amountOfUser = options.numberOfSchools * options.numberOfUsers;
  const percentageOfUuids = 1 - options.percentageOfCollision/100;
  const amountOfUuids = amountOfUser * percentageOfUuids;
  for (let i = 0; i <= amountOfUuids; i++) {
    uuidPool.push(faker.random.uuid())
  }
})();

const getUuid = () => {
  if(Number(options.percentageOfCollision) === 0) return uuidPool.shift();

  let uuid;
  const amountOfUser = options.numberOfSchools * options.numberOfUsers;
  const percentage = options.percentageOfCollision/100
  // increase by time to increase the change to reuse a uuid
  const increaseChance = (1 - ( uuidPool.length/amountOfUser )) * percentage;
  // math.random generate a value between 0 and 1 (exlude 1),
  // so if if no percentage of reuse is set it will never reuse a number
  if ((1 > (percentage + Math.random() + increaseChance) && uuidPool.length !== 0)
    || usedUuids.length === 0
  ){
    uuid = uuidPool.shift()
    usedUuids.push(uuid);
  } else {
    const pos = faker.random.number(usedUuids.length-1)
    uuid = usedUuids[pos];
  }

  return uuid;
}

const getEmailWithCollision = (email) => {
  if(Number(options.percentageOfCollision) === 0) return email;
  return `${getUuid()}@example.com`;
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
    mail: getEmailWithCollision(`${username}@example.org`),
    uuid: getUuid(),
  };
  return entry;
}

const getGroup = (name, members=[], directory, base) => {
  const entry = {
    dn: `cn=${name}, ${directory}, ${base}`,
    objectClass: ['top', 'groupOfNames'],
    description: name,
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
  const schoolName = `school${schoolId}`;
  const schoolDn = `o=${schoolName}, dc=de, ${options.basePath}`;

  const school = {
    dn: schoolDn,
    objectClass: ['top', 'organization'],
    o: schoolName,
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
    getGroup('ROLE_ADMIN', admins, 'ou=roles', schoolDn),
    getGroup('ROLE_TEACHER', teachers, 'ou=roles', schoolDn),
    getGroup('ROLE_STUDENT', students, 'ou=roles', schoolDn),
    getGroup('ROLE_NBC_EXCLUDE', ignored, 'ou=roles', schoolDn),
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
