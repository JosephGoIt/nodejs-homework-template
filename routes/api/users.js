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

        const user = await User.create({email, password: hashedPassword, avatarURL});
        res.status(201).json({
            user: {
                email: user.email,
                subscription: user.subscription,
                avatarURL: user.avatarURL,
            }
        });
    } catch (err) {
        next(err);
    }
});

// login endpoint
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  
  // comment this for now to refactor the login logic to a separate funtion for testing
  // router.post('/login', async (req, res, next) => {
  //   try {
  //     const { error } = loginSchema.validate(req.body);
  //     if (error) {
  //       return res.status(400).json({ message: error.details[0].message });
  //     }
  
  //     const { email, password } = req.body;
  //     const user = await User.findOne({ email });
  
  //     if (!user || !(await bcrypt.compare(password, user.password))) {
  //       return res.status(401).json({ message: "Email or password is wrong" });
  //     }
  
  //     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  //     user.token = token;
  //     await user.save();
  
  //     res.status(200).json({
  //       token,
  //       user: {
  //         email: user.email,
  //         subscription: user.subscription,
  //       }
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // });

  // The login function
  const login = async (req, res, next) => {
    try {
      const { error } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
  
      const { email, password } = req.body;
      const user = await User.findOne({ email });
  
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Email or password is wrong" });
      }
  
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      user.token = token;
      await user.save();
  
      res.status(200).json({
        token,
        user: {
          email: user.email,
          subscription: user.subscription,
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Export the login function
  // module.exports = login;
  
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
  

// Export both the login function and the router
module.exports = {
  login,
  router,
};