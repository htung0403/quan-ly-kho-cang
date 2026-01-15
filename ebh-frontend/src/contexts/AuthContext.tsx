import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, AuthResponse } from '@/types';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/utils';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    hasRole: (role: string) => boolean;
    hasPermission: (permission: string) => boolean;
    canAccessProject: (projectId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

const initialState: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, setState] = useState<AuthState>(initialState);

    // Check authentication on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = useCallback(async () => {
        const token = storage.get<string>('token');
        const user = storage.get<User>('user');
        const refreshToken = storage.get<string>('refreshToken');

        if (token && user) {
            try {
                // Verify token is still valid
                const response = await authApi.me() as any;
                const currentUser = response.data as User;

                setState({
                    user: currentUser,
                    token,
                    refreshToken,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } catch {
                // Token invalid, clear storage
                storage.remove('token');
                storage.remove('refreshToken');
                storage.remove('user');
                setState({ ...initialState, isLoading: false });
            }
        } else {
            setState({ ...initialState, isLoading: false });
        }
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
        setState((prev) => ({ ...prev, isLoading: true }));

        try {
            const response = await authApi.login(credentials.email, credentials.password) as any;
            const data = response.data as AuthResponse;

            storage.set('token', data.token);
            storage.set('refreshToken', data.refreshToken);
            storage.set('user', data.user);

            setState({
                user: data.user,
                token: data.token,
                refreshToken: data.refreshToken,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setState({ ...initialState, isLoading: false });
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Ignore logout errors
        } finally {
            storage.remove('token');
            storage.remove('refreshToken');
            storage.remove('user');
            setState({ ...initialState, isLoading: false });
        }
    }, []);

    const hasRole = useCallback(
        (role: string): boolean => {
            if (!state.user) return false;
            return state.user.role.name === role || state.user.role.name === 'admin';
        },
        [state.user]
    );

    const hasPermission = useCallback(
        (permission: string): boolean => {
            if (!state.user) return false;
            const permissions = state.user.role.permissions;
            return permissions.includes('*') || permissions.includes(permission);
        },
        [state.user]
    );

    const canAccessProject = useCallback(
        (_projectId: string): boolean => {
            if (!state.user) return false;
            // Admin can access all projects
            if (state.user.role.name === 'admin') return true;
            // Check if user has access to this project (this would need to be loaded from API)
            // For now, return true - actual implementation would check project_users table
            return true;
        },
        [state.user]
    );

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                checkAuth,
                hasRole,
                hasPermission,
                canAccessProject,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
