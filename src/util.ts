import { CYAN, GREEN, RED, RESET, YELLOW } from './type';

export const Logger = {
  info: (message?: any, ...optionalParams: any[]) => console.log(`${CYAN}${message}`, ...optionalParams, RESET),
  log: (message?: any, ...optionalParams: any[]) => console.log(`${GREEN}${message}`, ...optionalParams, RESET),
  warn: (message?: any, ...optionalParams: any[]) => console.log(`${YELLOW}${message}`, ...optionalParams, RESET),
  error: (message?: any, ...optionalParams: any[]) => console.log(`${RED}${message}`, ...optionalParams, RESET),
};
