const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../../models/user');
const auth = require('../../middlewares/auth'); // Import the auth middleware
const gravatar = require('gravatar');
const upload = require('../../middlewares/upload');
const fs = require('fs/promises');
const path = require('path');
const Jimp = require('jimp');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const nodemailer = require('nodemailer');

const router = express.Router();

const avatarsDir = path.join(__dirname, '../../public/avatars');

router.patch('/avatars', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    const { path: tempPath, originalname } = req.file;
    const ext = path.extname(originalname);
    const filename = `${req.user._id}${ext}`;
    const resultPath = path.join(avatarsDir, filename);

    // Process the image
    const image = await Jimp.read(tempPath);
    await image.resize(250, 250).writeAsync(resultPath);

    // Remove the temp file
    await fs.unlink(tempPath);

    // Update user's avatar URL
    const avatarURL = `/avatars/${filename}`;
    req.user.avatarURL = avatarURL;
    await req.user.save();

    res.status(200).json({ avatarURL });
  } catch (err) {
    next(err);
  }
});

// signup endpoint
const signupSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/signup', async (req, res, next) => {
  try {
      const {error} = signupSchema.validate(req.body);
      if (error) {
          return res.status(400).json({message: error.details[0].message});
      }

      const {email, password} = req.body;
      const existingUser = await User.findOne({email});
      if (existingUser) {
          return res.status(409).json({message: "Email in use"});
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const avatarURL = gravatar.url(email, { s: '250', d: 'retro' }, true);
      const verificationToken = uuidv4();  // Generate a unique verification token

      // Log the verification token to check if it's being generated
      console.log('Generated Verification Token:', verificationToken);

      const user = await User.create({
          email, 
          password: hashedPassword, 
          avatarURL, 
          verificationToken
      });

      // Create verification link
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify/${verificationToken}`;

      // Send verification email
      const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address (Outlook email)
        to: email,                    // List of receivers
        subject: 'Verify your email',  // Subject line
        text: `Click the link to verify your email: ${verificationUrl}`, // Plain text body
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({ message: 'Error sending email' });
        }
        console.log('Email sent:', info.response);
        res.status(201).json({
          user: {
            email: user.email,
            subscription: user.subscription,
            avatarURL: user.avatarURL
          }
        });
      });
  } catch (err) {
      console.error('Error in signup route:', err);
      res.status(500).json({message: 'Internal Server Error'});
  }
});


// login endpoint
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  // The login function
  const login = async (req, res, next) => {
    try {
      const { error } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
  
      const { email, password } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });

      // Ensure the user exists
      if (!user) {
        return res.status(401).json({ message: "Email or password is wrong" });
      }

      // Check if the user has verified their email
      if (!user.verify) {
        return res.status(401).json({ message: 'Please verify your email' });
      }
  
      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.status(401).json({ message: "Email or password is wrong" });
      }
  
      // Generate a JWT token for the authenticated user
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      user.token = token;
      await user.save();
  
      // Respond with the token and user data
      res.status(200).json({
        token,
        user: {
          email: user.email,
          subscription: user.subscription,
        }
      });
    } catch (err) {
      console.error('Error during login:', err);
      res.status(500).json({ message: 'Internal Server Error' });
      next(err);
    }
  };
  
  // Use the login function in the router
  router.post('/login', login);

  // logout endpoint
  router.get('/logout', auth, async (req, res, next) => {
    try {
      const user = req.user;
      user.token = null;
      await user.save();
  
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
 
// current user endpoint
router.get('/current', auth, async (req, res, next) => {
    try {
      const { email, subscription } = req.user;
      res.status(200).json({ email, subscription });
    } catch (err) {
      next(err);
    }
  });
  
// subscription endpoint
const subscriptionSchema = Joi.object({
    subscription: Joi.string().valid('starter', 'pro', 'business').required(),
  });
  
  router.patch('/subscription', auth, async (req, res, next) => {
    try {
      const { error } = subscriptionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
  
      const { subscription } = req.body;
      req.user.subscription = subscription;
      await req.user.save();
  
      res.status(200).json({
        email: req.user.email,
        subscription: req.user.subscription,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/verify/:verificationToken', async (req, res, next) => {
    try {
      const { verificationToken } = req.params;
      
      // Log the token to ensure it's being captured correctly
      console.log("Received verification token:", verificationToken);
      
      // Find the user by verification token
      const user = await User.findOne({ verificationToken });
      
      // Log if no user is found
      if (!user) {
        console.error("User not found with this verification token:", verificationToken);
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update user verification status
      user.verificationToken = null; // Set the token to null after successful verification
      user.verify = true;            // Set the verification status to true
      await user.save();
  
      res.status(200).json({ message: 'Verification successful' });
    } catch (error) {
      console.error("Error during verification process:", error); // Log the error details
      res.status(500).json({ message: error.message });
    }
  });
  

// resend verification
router.post('/verify', async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'missing required field email' });
  }

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verify) {
      return res.status(400).json({ message: 'Verification has already been passed' });
    }

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify/${user.verificationToken}`;

    const options = {
      method: 'POST',
      url: 'https://rapidprod-sendgrid-v1.p.rapidapi.com/mail/send',
      headers: {
        'x-rapidapi-key': 'fe5b783b33msh902a4057671f858p1517f7jsn3210a04ec37b',
        'x-rapidapi-host': 'rapidprod-sendgrid-v1.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: {
        personalizations: [{
          to: [{ email: user.email }],
          subject: 'Verify your email'
        }],
        from: { email: 'no-reply@example.com' },
        content: [{
          type: 'text/plain',
          value: `Click the link to verify your email: ${verificationUrl}`
        }]
      }
    };

    // Log email sending info
    console.log('Sending verification email to:', email);
    console.log('Email content:', options.data.content[0].value);

    await axios.request(options);
    res.status(200).json({ message: 'Verification email sent' });
    console.log('Email sent successfully:', response.data);

  } catch (error) {
    next(error);
  }
});



// Export both the login function and the router
module.exports = {
  login,
  router,
};