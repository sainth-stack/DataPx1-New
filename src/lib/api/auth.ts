import { authClient, toFormBody } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string | string[];
  tenant?: string;
  organization?: string;
}

export interface LoginResponse {
  status: string;
  message?: string;
  user?: AuthUser;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  organization?: string;
  roles?: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await authClient.post<LoginResponse>(
      "/api/login",
      toFormBody({ email, password }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return data;
  },

  async register(payload: RegisterPayload) {
    const body: Record<string, string> = {
      username: payload.username,
      email: payload.email,
      password: payload.password,
    };
    if (payload.organization) body.organization = payload.organization;
    if (payload.roles) body.roles = payload.roles;
    const { data } = await authClient.post(
      "/api/create_user",
      toFormBody(body),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return data;
  },

  async sendOtp(email: string) {
    const { data } = await authClient.post(
      "/api/send_otp",
      toFormBody({ email }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return data;
  },

  async verifyOtp(email: string, otp: string) {
    const { data } = await authClient.post(
      "/api/otp_verification",
      toFormBody({ email, otp }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return data;
  },
};
