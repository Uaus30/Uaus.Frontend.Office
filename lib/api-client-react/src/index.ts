import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

export type QueryKey = readonly unknown[];

export interface TokenDto {
  type: string;
  value: string;
  expiration: string;
}

export interface UserDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: number;
  status: number;
}

export interface UserListDto {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: number;
  status: number;
}

export interface AuthenticatedUserDto {
  user: UserDto;
  token: TokenDto;
}

export interface EnumOptionDto {
  id: number;
  value: string;
  name: string;
  allowSelect: boolean;
}

export interface PaginationDto {
  page: number;
  size: number;
  filteredItems: number;
}

export interface BackendPagedResult<T> {
  items: T[];
  pagination: PaginationDto;
}

export interface UiPagedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
}

export interface DepartmentDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  name: string;
  description: string | null;
}

export interface CategoryDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  departmentId: number;
  name: string;
  description: string | null;
}

export interface ProductGroupDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  categoryId: number;
  name: string;
  description: string | null;
}

export interface ProductDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  productGroupId: number;
  name: string;
  description: string | null;
  price: number;
  costPrice: number;
  stock: number;
  status: number;
}

export interface TagDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  name: string;
  color: string;
}

export interface ProductTagDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  productId: number;
  tagId: number;
}

export interface ImageDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  name: string;
  type: number;
  uuid: string;
  url: string;
  version: number;
}

export interface ProductImageDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  productId: number;
  imageId: number;
  displayOrder: number;
}

export interface SupplierDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  name: string;
  corporateName: string | null;
  document: string | null;
  salesRepresentative: string;
  phone: string;
  email: string | null;
  minimumPurchaseValue: number;
  status: number;
  city: string;
  state: string;
  avatarColor: string;
}

export interface SaleDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  customerId: number | null;
  total: number;
  discount: number;
  paymentMethod: number;
  paymentStatus: number;
  notes: string | null;
}

export interface SaleItemDto {
  id: number;
  createdAt: string;
  updatedAt: string | null;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  totalCost: number;
  profit: number;
}

export interface AuthSession {
  user: UserDto;
  token: TokenDto;
}

export interface ApiResponse<T> {
  data: T | null;
  response: Response;
}

const AUTH_STORAGE_KEY = "uaus-office-auth";

export const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_API_BASE_URL) ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "/api"
    : "https://api.uaus.com.br");

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = API_BASE_URL.startsWith("http")
    ? API_BASE_URL
    : typeof window !== "undefined"
      ? new URL(API_BASE_URL, window.location.origin).toString()
      : API_BASE_URL;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function readResponseBody(response: Response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload;

  if (payload && typeof payload === "object") {
    const candidateKeys = ["message", "detail", "title", "error"];
    for (const key of candidateKeys) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  return fallback;
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  setAuthSession(null);
}

export function isTokenExpired(session: AuthSession | null) {
  if (!session?.token.expiration) return true;
  return new Date(session.token.expiration).getTime() <= Date.now();
}

export async function apiRequest<T>(
  method: string,
  path: string,
  options?: {
    params?: Record<string, unknown>;
    body?: unknown;
    headers?: HeadersInit;
    auth?: boolean;
  },
): Promise<ApiResponse<T>> {
  const session = getAuthSession();
  const headers = new Headers(options?.headers);

  if (options?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.auth !== false && session?.token.value) {
    headers.set("Authorization", `Bearer ${session.token.value}`);
  }

  const response = await fetch(buildUrl(path, options?.params), {
    method,
    headers,
    body:
      options?.body == null
        ? undefined
        : headers.get("Content-Type") === "application/json"
          ? JSON.stringify(options.body)
          : (options.body as BodyInit),
  });

  const payload = await readResponseBody(response);

  if (!response.ok) {
    const fallback = `Erro ${response.status} ao acessar ${path}`;
    throw new ApiError(extractErrorMessage(payload, fallback), response.status, payload);
  }

  return {
    data: payload as T | null,
    response,
  };
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, unknown>,
  options?: { auth?: boolean; headers?: HeadersInit },
) {
  const result = await apiRequest<T>("GET", path, {
    params,
    auth: options?.auth,
    headers: options?.headers,
  });
  return result.data as T;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: { auth?: boolean; headers?: HeadersInit },
) {
  const result = await apiRequest<T>("POST", path, {
    body,
    auth: options?.auth,
    headers: options?.headers,
  });
  return result;
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  options?: { auth?: boolean; headers?: HeadersInit },
) {
  const result = await apiRequest<T>("PUT", path, {
    body,
    auth: options?.auth,
    headers: options?.headers,
  });
  return result;
}

export async function apiDelete<T>(
  path: string,
  options?: { auth?: boolean; headers?: HeadersInit },
) {
  const result = await apiRequest<T>("DELETE", path, {
    auth: options?.auth,
    headers: options?.headers,
  });
  return result;
}

export function extractCreatedId(response: Response) {
  const location = response.headers.get("Location");
  if (!location) return null;

  const match = location.match(/\/(\d+)(?:\?.*)?$/);
  return match ? Number(match[1]) : null;
}

export function mapPagedResult<T>(result: BackendPagedResult<T>): UiPagedResult<T> {
  const page = result.pagination.page ?? 1;
  const limit = result.pagination.size ?? result.items.length;
  const total = result.pagination.filteredItems ?? result.items.length;

  return {
    data: result.items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
  };
}

export async function fetchAllPages<T>(
  path: string,
  params?: Record<string, unknown>,
  size = 200,
) {
  const allItems: T[] = [];
  let page = 1;

  while (true) {
    const paged = await apiGet<BackendPagedResult<T>>(path, {
      ...params,
      page,
      size,
    });

    allItems.push(...paged.items);

    const total = paged.pagination.filteredItems ?? allItems.length;
    if (allItems.length >= total || paged.items.length === 0) break;
    page += 1;
  }

  return allItems;
}

function useCrudMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    mutation?: UseMutationOptions<TData, ApiError, TVariables>;
  },
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    ...options?.mutation,
  });
}

export const getGetMeQueryKey = (): QueryKey => ["auth", "me"];
export const getGetUsersQueryKey = (): QueryKey => ["users"];
export const getGetCustomersQueryKey = (): QueryKey => ["customers"];
export const getGetSalesQueryKey = (): QueryKey => ["sales"];
export const getGetCategoriesQueryKey = (): QueryKey => ["categories"];

export function useGetMe(options?: {
  query?: Omit<UseQueryOptions<UserDto | null, ApiError, UserDto | null, QueryKey>, "queryKey" | "queryFn">;
}) {
  return useQuery<UserDto | null, ApiError, UserDto | null, QueryKey>({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const session = getAuthSession();
      if (!session || isTokenExpired(session)) {
        clearAuthSession();
        return null;
      }
      return session.user;
    },
    ...options?.query,
  });
}

export function useLogin(options?: {
  mutation?: UseMutationOptions<
    AuthenticatedUserDto,
    ApiError,
    { data: { login?: string; email?: string; username?: string; password: string } }
  >;
}) {
  return useCrudMutation(async ({ data }) => {
    const login = data.login ?? data.username ?? data.email ?? "";
    const authResponse = await apiRequest<AuthenticatedUserDto>("POST", "/Users/authenticate", {
      params: {
        login,
        password: data.password,
      },
      auth: false,
    });

    const session = authResponse.data as AuthenticatedUserDto;
    setAuthSession(session);
    return session;
  }, options);
}

export function useLogout(options?: {
  mutation?: UseMutationOptions<void, ApiError, void>;
}) {
  return useCrudMutation(async () => {
    clearAuthSession();
  }, options);
}

export function useGetUsers(
  params?: { search?: string; page?: number; limit?: number },
  options?: {
    query?: Omit<UseQueryOptions<UiPagedResult<UserListDto>, ApiError, UiPagedResult<UserListDto>, QueryKey>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<UiPagedResult<UserListDto>, ApiError, UiPagedResult<UserListDto>, QueryKey>({
    queryKey: [...getGetUsersQueryKey(), params ?? {}],
    queryFn: async () => {
      const result = await apiGet<BackendPagedResult<UserListDto>>("/Users", {
        search: params?.search,
        page: params?.page ?? 1,
        size: params?.limit ?? 20,
      });
      return mapPagedResult(result);
    },
    ...options?.query,
  });
}

export function useCreateUser(options?: {
  mutation?: UseMutationOptions<null, ApiError, { data: unknown }>;
}) {
  return useCrudMutation(async ({ data }) => {
    const response = await apiPost<null>("/Users", data);
    return response.data;
  }, options);
}

export function useUpdateUser(options?: {
  mutation?: UseMutationOptions<UserDto | null, ApiError, { id: number; data: unknown }>;
}) {
  return useCrudMutation(async ({ id, data }) => {
    const response = await apiPut<UserDto>("/Users", { id, ...(data as object) });
    return response.data;
  }, options);
}

export function useDeleteUser(options?: {
  mutation?: UseMutationOptions<null, ApiError, { id: number }>;
}) {
  return useCrudMutation(async ({ id }) => {
    const response = await apiDelete<null>(`/Users/${id}`);
    return response.data;
  }, options);
}

export function useGetCustomers(
  params?: { search?: string; page?: number; limit?: number },
  options?: {
    query?: Omit<UseQueryOptions<UiPagedResult<CustomerDto>, ApiError, UiPagedResult<CustomerDto>, QueryKey>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<UiPagedResult<CustomerDto>, ApiError, UiPagedResult<CustomerDto>, QueryKey>({
    queryKey: [...getGetCustomersQueryKey(), params ?? {}],
    queryFn: async () => {
      const result = await apiGet<BackendPagedResult<CustomerDto>>("/Customers", {
        search: params?.search,
        page: params?.page ?? 1,
        size: params?.limit ?? 20,
      });
      return mapPagedResult(result);
    },
    ...options?.query,
  });
}

export function useCreateCustomer(options?: {
  mutation?: UseMutationOptions<null, ApiError, { data: unknown }>;
}) {
  return useCrudMutation(async ({ data }) => {
    const response = await apiPost<null>("/Customers", data);
    return response.data;
  }, options);
}

export function useUpdateCustomer(options?: {
  mutation?: UseMutationOptions<CustomerDto | null, ApiError, { id: number; data: unknown }>;
}) {
  return useCrudMutation(async ({ id, data }) => {
    const response = await apiPut<CustomerDto>("/Customers", { id, ...(data as object) });
    return response.data;
  }, options);
}

export function useDeleteCustomer(options?: {
  mutation?: UseMutationOptions<null, ApiError, { id: number }>;
}) {
  return useCrudMutation(async ({ id }) => {
    const response = await apiDelete<null>(`/Customers/${id}`);
    return response.data;
  }, options);
}

export function useGetSales(
  params?: { page?: number; limit?: number },
  options?: {
    query?: Omit<UseQueryOptions<UiPagedResult<SaleDto>, ApiError, UiPagedResult<SaleDto>, QueryKey>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<UiPagedResult<SaleDto>, ApiError, UiPagedResult<SaleDto>, QueryKey>({
    queryKey: [...getGetSalesQueryKey(), params ?? {}],
    queryFn: async () => {
      const result = await apiGet<BackendPagedResult<SaleDto>>("/Sales", {
        page: params?.page ?? 1,
        size: params?.limit ?? 20,
      });
      return mapPagedResult(result);
    },
    ...options?.query,
  });
}

export function useCreateSale(options?: {
  mutation?: UseMutationOptions<ApiResponse<null>, ApiError, { data: unknown }>;
}) {
  return useCrudMutation(async ({ data }) => apiPost<null>("/Sales", data), options);
}

export function useDeleteSale(options?: {
  mutation?: UseMutationOptions<null, ApiError, { id: number }>;
}) {
  return useCrudMutation(async ({ id }) => {
    const response = await apiDelete<null>(`/Sales/${id}`);
    return response.data;
  }, options);
}

export function useGetCategories(
  params?: { search?: string; departmentId?: number; page?: number; limit?: number },
  options?: {
    query?: Omit<UseQueryOptions<UiPagedResult<CategoryDto>, ApiError, UiPagedResult<CategoryDto>, QueryKey>, "queryKey" | "queryFn">;
  },
) {
  return useQuery<UiPagedResult<CategoryDto>, ApiError, UiPagedResult<CategoryDto>, QueryKey>({
    queryKey: [...getGetCategoriesQueryKey(), params ?? {}],
    queryFn: async () => {
      const result = await apiGet<BackendPagedResult<CategoryDto>>("/Categories", {
        search: params?.search,
        departmentId: params?.departmentId,
        page: params?.page ?? 1,
        size: params?.limit ?? 20,
      });
      return mapPagedResult(result);
    },
    ...options?.query,
  });
}

export function useCreateCategory(options?: {
  mutation?: UseMutationOptions<null, ApiError, { data: unknown }>;
}) {
  return useCrudMutation(async ({ data }) => {
    const response = await apiPost<null>("/Categories", data);
    return response.data;
  }, options);
}

export function useUpdateCategory(options?: {
  mutation?: UseMutationOptions<CategoryDto | null, ApiError, { id: number; data: unknown }>;
}) {
  return useCrudMutation(async ({ id, data }) => {
    const response = await apiPut<CategoryDto>("/Categories", { id, ...(data as object) });
    return response.data;
  }, options);
}

export function useDeleteCategory(options?: {
  mutation?: UseMutationOptions<null, ApiError, { id: number }>;
}) {
  return useCrudMutation(async ({ id }) => {
    const response = await apiDelete<null>(`/Categories/${id}`);
    return response.data;
  }, options);
}
