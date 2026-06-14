import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  REFRESH_TOKEN: 'REFRESH_TOKEN'
};

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null,
  refreshToken: null
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
        accessToken: null,
        refreshToken: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        accessToken: null,
        refreshToken: null
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: !!action.payload.user,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        user: action.payload.user
      };

    default:
      return state;
  }
}

// Storage utilities
const storage = {
  getTokens: () => {
    try {
      return {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken')
      };
    } catch (error) {
      return { accessToken: null, refreshToken: null };
    }
  },

  setTokens: (accessToken, refreshToken) => {
    try {
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  },

  clearTokens: () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
};

// Axios interceptors setup
const setupAxiosInterceptors = (dispatch, getAccessToken) => {
  // Request interceptor to add auth token
  axios.interceptors.request.use(
    (config) => {
      const accessToken = getAccessToken();
      if (accessToken && config.url?.startsWith('/api/')) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle token refresh
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/api/auth/login') {
        originalRequest._retry = true;

        const { refreshToken } = storage.getTokens();
        if (refreshToken) {
          try {
            const response = await axios.post('/api/auth/refresh', {
              refreshToken
            });

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

            dispatch({
              type: AUTH_ACTIONS.REFRESH_TOKEN,
              payload: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: response.data.user
              }
            });

            storage.setTokens(newAccessToken, newRefreshToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);

          } catch (refreshError) {
            // Refresh failed, log out user
            console.log('Token refresh failed, logging out');
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
            storage.clearTokens();
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token, log out user
          console.log('No refresh token, logging out');
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          storage.clearTokens();
        }
      }

      return Promise.reject(error);
    }
  );
};

// AuthProvider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Get access token for interceptors
  const getAccessToken = () => state.accessToken || storage.getTokens().accessToken;

  // Setup axios interceptors
  useEffect(() => {
    setupAxiosInterceptors(dispatch, getAccessToken);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const { accessToken } = storage.getTokens();
      
      if (accessToken) {
        try {
          const response = await axios.get('/api/auth/validate');
          
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { 
              user: response.data.user,
              accessToken,
              refreshToken: storage.getTokens().refreshToken
            }
          });

        } catch (error) {
          console.log('Token validation failed:', error.message);
          // Invalid token, clear storage
          storage.clearTokens();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: { isLoading: false } });
      }
    };

    checkExistingSession();
  }, []);

  // Auth actions
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await axios.post('/api/auth/login', credentials);
      const { user, accessToken, refreshToken } = response.data;

      storage.setTokens(accessToken, refreshToken);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken, refreshToken }
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });

      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    // Registration disabled
    return { success: false, error: 'Registration is not available' };
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error);
    }

    storage.clearTokens();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  const logoutAll = async () => {
    try {
      await axios.post('/api/auth/logout-all');
    } catch (error) {
      console.error('Logout all error:', error);
    }

    storage.clearTokens();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/profile', profileData);
      
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: { user: response.data.user }
      });

      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await axios.put('/api/profile/password', passwordData);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    logoutAll,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;