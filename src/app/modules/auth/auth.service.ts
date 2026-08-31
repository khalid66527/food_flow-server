import { usersCollection } from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { TRegisterData, TLoginData, TAuthResponse } from './auth.interface';

const registerUser = async (data: TRegisterData): Promise<TAuthResponse> => {
  const { name, email, password, role, phone } = data;

  if (!name || !email || !password) {
    throw new Error('Name, email and password are required.');
  }

  // Check if user already exists
  const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  const now = new Date();
  const hashedPassword = await hashPassword(password);

  const newUser = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || '',
    password: hashedPassword,
    role: role || 'Customer',
    status: 'active' as const,
    image: '',
    createdAt: now,
    updatedAt: now,
  };

  const result = await usersCollection.insertOne(newUser as any);

  const token = generateToken({
    userId: result.insertedId.toString(),
    email: newUser.email,
    role: newUser.role,
  });

  const { password: _, ...userWithoutPassword } = newUser;

  return {
    user: { ...userWithoutPassword, _id: result.insertedId } as any,
    token,
  };
};

const loginUser = async (data: TLoginData): Promise<TAuthResponse> => {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const user = await usersCollection.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isPasswordValid = await comparePassword(password, user.password as string);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken({
    userId: (user._id as any).toString(),
    email: user.email,
    role: user.role,
  });

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword as any,
    token,
  };
};

const getMe = async (userId: string) => {
  const { ObjectId } = await import('mongodb');

  let user;
  if (ObjectId.isValid(userId)) {
    user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  }

  if (!user) {
    throw new Error('User not found.');
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const AuthService = {
  registerUser,
  loginUser,
  getMe,
};
