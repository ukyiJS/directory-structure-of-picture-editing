import { BRIGHT, CYAN, GREEN, RED, RESET, UNDERSCORE, YELLOW } from './type';

export const Logger = {
  info: (message?: any, ...optionalParams: any[]) => console.log(`${CYAN}${message}`, ...optionalParams, RESET),
  log: (message?: any, ...optionalParams: any[]) => console.log(`${GREEN}${message}`, ...optionalParams, RESET),
  warn: (message?: any, ...optionalParams: any[]) => console.log(`${YELLOW}${message}`, ...optionalParams, RESET),
  error: (message?: any, ...optionalParams: any[]) => console.log(`${RED}${message}`, ...optionalParams, RESET),
};

type messageType = 'cyan' | 'green' | 'yellow' | 'red';

const getType = (type?: messageType): string => {
  switch (type) {
    case 'cyan':
      return CYAN;
    case 'green':
      return GREEN;
    case 'yellow':
      return YELLOW;
    case 'red':
      return RED;
    default:
      return '';
  }
};

export const underscore = (message: string, type?: messageType) => `${UNDERSCORE}${getType(type)}${message}${RESET}`;
export const bright = (message: string, type?: messageType) => `${BRIGHT}${getType(type)}${message}${RESET}`;
