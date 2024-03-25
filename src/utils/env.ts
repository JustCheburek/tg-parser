// Type definitions for Ethereum-style addresses and hexadecimal strings
export type Address = `0x${string}`;
export type Hex = `0x${string}`;

// Interfaces for working with environment variables in Vite and similar setups
export interface ImportMetaEnv {
  [key: string]: string | undefined;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Supported types for environment variables
export type EnvVarTypes =
  | 'string'
  | 'string[]'
  | 'number'
  | 'address'
  | 'hex'
  | 'boolean';

// Type definition for parsing and returning environment variables according to their types and requirement status
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

// Function type for transforming environment variables from string to the specified type
export type EnvVarTransform<
  T extends EnvVarTypes = 'string',
  R extends boolean = true,
> = (value: ParsedEnvVar<T, R>) => ParsedEnvVar<T, R> | never;

/**
 * Determines the correct source of environment variables based on the execution environment.
 * Supports both browser (via import.meta.env) and Node.js (via process.env).
 *
 * @returns {ImportMetaEnv} An object representing the current set of environment variables.
 */
export const getEnvironmentVariables = (): ImportMetaEnv => {
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
 * Retrieves and optionally transforms an environment variable, throwing an error if a required variable is missing.
 *
 * @param {string} name - The name of the environment variable.
 * @param {EnvVarTypes} [type='string'] - The type to which the variable should be coerced.
 * @param {boolean} [required=true] - Whether the presence of the variable is mandatory.
 * @param {EnvVarTransform} [transform] - An optional function to further transform the variable's value.
 * @returns {ParsedEnvVar<T, R> | never} - The environment variable, coerced and optionally transformed to the specified type.
 */
export const getEnvVar = <
  T extends EnvVarTypes = 'string',
  R extends boolean = true,
>(
  name: string,
  type: T = 'string' as T,
  required: R = true as R,
  transform?: EnvVarTransform<T, R>,
): ParsedEnvVar<T, R> | never => {
  const envVars = getEnvironmentVariables();
  const rawValue = envVars[name];
  const transformFn = transform ?? ((value) => value);

  // Handle missing but required variables
  if (rawValue === undefined) {
    if (required) {
      throw new Error(`Environment variable ${name} is required but not set.`);
    } else {
      return transformFn(undefined as ParsedEnvVar<T, R>);
    }
  }

  // Coerce and transform the variable to the specified type
  switch (type) {
    case 'string[]':
      return transformFn(
        rawValue.split(',').map((item) => item.trim()) as ParsedEnvVar<T, R>,
      );
    case 'number':
      // eslint-disable-next-line no-case-declarations
      const numberValue = Number(rawValue);
      if (isNaN(numberValue)) {
        throw new Error(`Environment variable ${name} is not a valid number.`);
      }
      return transformFn(numberValue as ParsedEnvVar<T, R>);
    case 'address':
    case 'hex':
      return transformFn(rawValue as ParsedEnvVar<T, R>);
    case 'boolean':
      return transformFn(
        (rawValue.toLowerCase() === 'true') as ParsedEnvVar<T, R>,
      );
    default:
      return transformFn(rawValue as ParsedEnvVar<T, R>);
  }
};
