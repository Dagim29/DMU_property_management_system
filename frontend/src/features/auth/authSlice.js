import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post('/users/auth/login/', credentials)
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Login failed')
  }
})

export const logout = createAsyncThunk('auth/logout', async () => {
  const refreshToken = localStorage.getItem('refreshToken')
  try {
    await api.post('/users/auth/logout/', { refresh: refreshToken })
  } catch (error) {
    // Ignore errors on logout
  }
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
})

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async () => {
  const response = await api.get('/users/auth/profile/')
  return response.data
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    sessionTimeout: parseInt(localStorage.getItem('sessionTimeout') || '60'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action) => {
      state.user = action.payload
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.access
        state.refreshToken = action.payload.refresh
        state.user = action.payload.user
        state.sessionTimeout = action.payload.session_timeout || 60
        localStorage.setItem('token', action.payload.access)
        localStorage.setItem('refreshToken', action.payload.refresh)
        localStorage.setItem('user', JSON.stringify(action.payload.user))
        localStorage.setItem('sessionTimeout', action.payload.session_timeout || '60')
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Login failed'
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.refreshToken = null
        state.sessionTimeout = 60
        state.isAuthenticated = false
        localStorage.removeItem('sessionTimeout')
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload
        localStorage.setItem('user', JSON.stringify(action.payload))
      })
  },
})

export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer
