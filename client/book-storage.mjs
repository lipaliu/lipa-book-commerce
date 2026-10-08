let connection;
function open(){return connection||=new Promise((resolve,reject)=>{const r=indexedDB.open('lipa-book-sources',1);r.onupgradeneeded=()=>{r.result.createObjectStore('files',{keyPath:'id'});r.result.createObjectStore('pages',{keyPath:'id'}).createIndex('bookId','bookId');r.result.createObjectStore('work',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('浏览器本地存储不可用，请换普通浏览器窗口'));});}
export async function bookStore(store,mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),request=action(tx.objectStore(store));let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||new Error('本地保存失败，可能空间不足；请保留原文件'));});}
export const getBookFile=id=>bookStore('files','readonly',s=>s.get(id));
export const getBookPages=bookId=>bookStore('pages','readonly',s=>s.index('bookId').getAll(bookId));
export const saveBookPage=page=>bookStore('pages','readwrite',s=>s.put(page));
export const getBookWork=id=>bookStore('work','readonly',s=>s.get(id));
export const saveBookWork=work=>bookStore('work','readwrite',s=>s.put(work));
