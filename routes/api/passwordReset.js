const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const User = require('../../models/user');

const router = express.Router();

// Define the schema for password reset
const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  newPassword: Joi.string().min(6).required(),
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  // Validate the request body
  const { error } = resetPasswordSchema.validate({ email, newPassword });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Find the user by email and update the password
    const user = await User.findOneAndUpdate({ email }, { password: hashedPassword });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
