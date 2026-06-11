import axios from 'axios';

const BASE_URL = 'https://amaan909-smart-datastudio-backend.hf.space/api/auth';
const TOKEN_KEY = 'sds_token';

// SIGN UP
export const signUp = async (fullName, email, password) => {
  const res = await axios.post(`${BASE_URL}/signup/`, {
    full_name: fullName,
    email,
    password
  });
  localStorage.setItem(TOKEN_KEY, res.data.token);
  return res.data.user;
};

// LOG IN
export const logIn = async (email, password) => {
  const res = await axios.post(`${BASE_URL}/login/`, {
    email,
    password
  });
  localStorage.setItem(TOKEN_KEY, res.data.token);
  return res.data.user;
};

// LOG OUT
export const logOut = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// GET SESSION (decode token payload without verification)
export const getSession = () => {
  const token = getToken();
  if (!token) return null;
  try {
    // Decode JWT payload (middle part)
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return {
      id: payload.user_id,
      email: payload.email,
      full_name: payload.full_name
    };
  } catch {
    return null;
  }
};

// IS LOGGED IN
export const isLoggedIn = () => getSession() !== null;

// GET AUTH HEADER
export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// VERIFY TOKEN WITH SERVER
export const verifySession = async () => {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await axios.get(`${BASE_URL}/verify/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.user;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
};
