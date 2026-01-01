import * as authService from "./auth.service.js";

export const register = authService.register;
export const login = authService.login;
export const logout = authService.logout;
export const getMe = authService.getMe;
