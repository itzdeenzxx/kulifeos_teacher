const fs = require('fs');

const path = './src/lib/db.ts';
let code = fs.readFileSync(path, 'utf8');

// replace the imports
if (!code.includes('addDoc')) {
  code = code.replace(
    'import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";',
    'import { collection, doc, getDoc, getDocs, query, addDoc } from "firebase/firestore";'
  );
}

const addProjectCode = `
export const createProjectSpace = async (project: Omit<ProjectSpace, "id">) => {
  const colRef = collection(db, "projectSpaces");
  const newRef = await addDoc(colRef, project);
  return { id: newRef.id, ...project };
};
`;

if (!code.includes('createProjectSpace')) {
  code += addProjectCode;
}

fs.writeFileSync(path, code);
