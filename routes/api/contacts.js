const express = require('express');
const Joi = require('joi');
const auth = require('../../middlewares/auth');
const Contact = require('../../models/contact'); // Make sure this is the correct path
const {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
} = require('../../models/contacts');

const router = express.Router();

const contactSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  favorite: Joi.boolean(),
});

const favoriteSchema = Joi.object({
  favorite: Joi.boolean().required(),
});

// Get contact
router.get('/', auth, async (req, res, next) => {
  try {
    const contacts = await listContacts(req.user._id, req.query); // added req.user._id, req.query
    res.status(200).json(contacts);
  } catch (error) {
    next(error);
  }
});

// Get a specific contact by ID
router.get('/:contactId', auth, async (req, res, next) => {
  try {
    // Find the contact by ID
    const contact = await getContactById(req.params.contactId);

     // If contact doesn't exist, return 404
     if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Ensure the logged-in user is the owner of the contact
    if (contact.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(contact);
  } catch (error) {
    next(error);
  }
});

// add new contact
router.post('/', auth, async (req, res, next) => {
  try {

     // Log the user to check if it's properly set
     console.log("Logged-in user:", req.user);

    const {error} = contactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({message: `missing required ${error.details[0].path[0]} field`});
    }

    // Add the authenticated user's ID as the owner of the contact
    const newContact = await addContact({
      ...req.body,
      owner: req.user._id, // Make sure the owner field is populated with the logged-in user's ID
    });
    res.status(201).json(newContact);
  } catch (error) {
    next (error);
  }
});

// Delete contact
router.delete('/:contactId', auth, async (req, res, next) => {
  try {
    // Extract the contactId from the request parameters
    const { contactId } = req.params;

    // Fetch the contact by ID to check if it exists
    const contact = await getContactById(contactId); // Ensure this function is defined in your model

    // If contact doesn't exist, return 404
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Ensure the logged-in user is the owner of the contact
    if (contact.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Use findByIdAndDelete to delete the contact
    await Contact.findByIdAndDelete(contactId);

    res.status(200).json({ message: 'Contact deleted' });
  } catch (error) {
    console.error("Error during contact deletion:", error);
    next(error);
  }
});

// Update contacts
router.put('/:contactId', auth, async (req, res, next) => {
  try {
    // Check if the request body has data
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Extract the contactId from the request parameters
    const { contactId } = req.params;

    // Fetch the contact by ID to check if it exists
    const contact = await getContactById(contactId); // Ensure this function is defined in your model

    // If contact doesn't exist, return 404
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Ensure the logged-in user is the owner of the contact
    if (contact.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If ownership is verified, update the contact
    const updatedContact = await updateContact(contactId, req.body);

    res.status(200).json(updatedContact);

  } catch (error) {
    console.error("Error during contact update:", error);
    next(error);
  }
});


// Update contacts.favorite
router.patch('/:contactId/favorite', auth, async (req, res, next) => {
  try {
    // Validate the favorite field in the request body
    const { error } = favoriteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Missing field favorite' });
    }

    // Extract the contactId from the request parameters
    const { contactId } = req.params;

    // Fetch the contact by ID to check if it exists
    const contact = await getContactById(contactId); // Ensure this function is defined in your model

    // If contact doesn't exist, return 404
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Ensure the logged-in user is the owner of the contact
    if (contact.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If ownership is verified, update the favorite status
    const updatedContact = await updateStatusContact(contactId, req.body);

    res.status(200).json(updatedContact);

  } catch (error) {
    console.error("Error during contact update:", error);
    next(error);
  }
});


module.exports = router;
