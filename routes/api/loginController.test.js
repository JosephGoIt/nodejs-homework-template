const login = require('../../routes/api/users'); // Correct import
const User = require('../../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

console.log('Imported login function:', login);

const loginFunction = login.login;

jest.mock('../../models/user');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('Login Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'password',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  it('should return status 200 and a token with user object on successful login', async () => {
    const user = {
      _id: 'someId',
      email: 'test@example.com',
      password: 'hashedpassword',
      subscription: 'starter',
      save: jest.fn(),
    };

    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    const token = 'somejsonwebtoken';
    jwt.sign.mockReturnValue(token);

    await loginFunction(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          email: expect.any(String),
          subscription: expect.any(String),
        }),
      })
    );

    const jsonResponse = res.json.mock.calls[0][0];
    expect(typeof jsonResponse.user.email).toBe('string');
    expect(typeof jsonResponse.user.subscription).toBe('string');
  });

  it('should call next with an error if login fails', async () => {
    User.findOne.mockResolvedValue(null);

    await loginFunction(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
