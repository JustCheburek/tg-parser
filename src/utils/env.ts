export type Address = `0x${string}`;

export type Hex = `0x${string}`;

export interface ImportMetaEnv {
  [key: string]: string | undefined;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export type EnvVarTypes =
  | 'string'
  | 'string[]'
  | 'number'
  | 'address'
  | 'hex'
  | 'boolean';

export type ParsedEnvVar<
  T extends EnvVarTypes,
  R extends boolean,
> = T extends 'string'
  ? R extends true
    ? string
    : string | undefined
  : T extends 'string[]'
    ? R extends true
      ? string[]
      : string[] | undefined
    : T extends 'number'
      ? R extends true
        ? number
        : number | undefined
      : T extends 'address'
        ? R extends true
          ? Address
          : Address | undefined
        : T extends 'hex'
          ? R extends true
            ? Hex
            : Hex | undefined
          : T extends 'boolean'
            ? R extends true
              ? boolean
              : boolean | undefined
            : never;

export type EnvVarTransform<
  T extends EnvVarTypes = 'string',
  R extends boolean = true,
> = (value: ParsedEnvVar<T, R>) => ParsedEnvVar<T, R> | never;

// Cross system environment helper
export const getEnvironmentVariables = () => {
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as ImportMeta).env
  ) {
    return (import.meta as unknown as ImportMeta).env;
  } else if (typeof process !== 'undefined' && process.env) {
    return process.env;
  } else {
    return {} as ImportMetaEnv;
  }
};

/**
 * Gets a variable from environment
 *
 * @param {string} name Variable name
 * @param {('string'
 *     | 'string[]'
 *     | 'number'
 *     | 'address'
 *     | 'hex'
 *     | 'boolean')} [type='string'] Value type coercion
 * @param {boolean} [required=true] Is required
 * @param {EnvVarTransform} transform Variable transformation callback
 * @returns
 */
export const getEnvVar = <
  T extends EnvVarTypes = 'string',
  R extends boolean = true,
>(
  name: string,
  type: T = 'string' as T,
  required: R = true as R,
  transform?: EnvVarTransform<T, R>,
) => {
  const value = getEnvironmentVariables()[name] as string;
  const transformFn = transform ?? ((value) => value);

  if (!value) {
    if (required) {
      throw new Error(`Environment variable ${name} is required`);
    } else {
      return transformFn(undefined as ParsedEnvVar<T, R>);
    }
  }

  switch (type) {
    case 'string[]':
      return transformFn(
        value.split(',').map((uri) => uri.trim()) as ParsedEnvVar<T, R>,
      );
    case 'number':
      // eslint-disable-next-line no-case-declarations
      const numberValue = Number(value);
      if (isNaN(numberValue)) {
        throw new Error(`Environment variable ${name} is not a valid number`);
      }
      return transformFn(numberValue as ParsedEnvVar<T, R>);
    case 'address':
      return transformFn(value as ParsedEnvVar<T, R>);
    case 'hex':
      return transformFn(value as ParsedEnvVar<T, R>);
    case 'boolean':
      return transformFn(
        (value.toLowerCase() === 'true') as ParsedEnvVar<T, R>,
      );
    default:
      return transformFn(value as ParsedEnvVar<T, R>);
  }
};
