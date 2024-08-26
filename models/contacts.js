// const fs = require('fs/promises');
// const path = require('path');
// const {v4: uuidv4} = require('uuid');

// const contactsPath = path.join(__dirname, 'contacts.json');

const Contact = require('../models/contact'); //schema

const listContacts = async () => {
  // const data = await fs.readFile(contactsPath, 'utf-8');
  // return JSON.parse(data);
  return await Contact.find({});
};

const getContactById = async (contactId) => {
  // const contacts = await listContacts();
  // return contacts.find(contact => contact.id === contactId) || null;
  return await Contact.findById(contactId)
};

const removeContact = async (contactId) => {
  // const contacts = await listContacts();
  // const filteredContacts = contacts.filter(contact => contact.id !== contactId);
  // await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  // return contacts.length !== filteredContacts.length;
  return await Contact.findByIdAndDelete(contactId);
};

const addContact = async (body) => {
  // const contacts = await listContacts();
  // const newContact = {id: uuidv4(), ...body};
  // contacts.push(newContact);
  // await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  // return newContact;
  const contact = new Contact(body);
  return await contact.save();
};

const updateContact = async (contactId, body) => {
  // const contacts = await listContacts();
  // const index = contacts.findIndex(contact => contact.id === contactId);
  // if(index === -1) {
  //   return null;
  // }
  // contacts[index] = {...contacts[index], ...body};
  // await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  // return contacts[index];
  return await Contact.findByIdAndUpdate(contactId, body, { new: true });
};

const updateStatusContact = async (contactId, body) => {
  return await Contact.findByIdAndUpdate(contactId, body, { new: true });
};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
}
