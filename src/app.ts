import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { createInterface, Interface } from 'readline';
import { BRIGHT, CYAN, GREEN, JPG, ORIGINAL_DOCUMENT, RAW, RESET, UNDERSCORE, YELLOW } from './type';
import { Logger } from './util';

export class App {
  private rootPath: string;
  private dirNames: string[];
  private originalDocumentDirNames: [RAW, JPG];
  private rawRegExp: RegExp;
  private jpgRegExp: RegExp;
  private isRootPictureFiles: boolean;
  private isOriginalDocumentDir: boolean;
  private isDeleteNonContrastFiles: boolean;
  private readline: Interface;

  constructor(dirNames: string[]) {
    this.rootPath = process.cwd();
    this.dirNames = [ORIGINAL_DOCUMENT, ...dirNames];
    this.originalDocumentDirNames = [RAW, JPG];
    this.rawRegExp = /crw|cr2|cr3|nef|nrw|pef|dng|raf|srw|orf|srf|sr2|arw|rw2|3fr|dcr|kdc|mrw|rwl|mos|x3f|gpr/;
    this.jpgRegExp = /jpg/;
    this.isRootPictureFiles = this.hasPictureFiles(this.jpgRegExp, this.rawRegExp);
    this.isOriginalDocumentDir = this.hasDirectory(join(this.rootPath, ORIGINAL_DOCUMENT));
    this.isDeleteNonContrastFiles = false;
    this.readline = createInterface({ input: process.stdin, output: process.stdout });
  }

  public start = async (): Promise<void> => {
    Logger.info(`${BRIGHT}첫번째 실행: 폴더구조 만들기 및 사진이동 만들기`);
    Logger.info(`${BRIGHT}두번째 실행: 첫번째 작업이 완료되면 raw파일과 jpg파일 대조 후 파일 제거\r\n`);

    if (this.isRootPictureFiles) {
      Logger.log('################### 1.폴더구조 만들기 및 사진이동 ###################\r\n');
    }

    if (!this.isRootPictureFiles && !this.isOriginalDocumentDir) {
      Logger.error('######################## 사진파일이 없음 ########################');
    }

    await this.addDirectories();
    await this.addRawDirectories();

    if (!this.isRootPictureFiles && this.isDeleteNonContrastFiles) {
      Logger.log('########### 2.raw파일과 jpg파일 대조 후 없는 파일 제거 ###########\r\n');
      await this.deleteNonContrastFiles();
    }

    await this.movePictureFiles();

    this.exitMessage();
  };

  private addDirectories = async (): Promise<void> => {
    const isSuccess = this.dirNames.every(dirName => {
      const path = join(this.rootPath, dirName);
      if (this.isOriginalDocumentDir) return false;

      mkdirSync(path);
      Logger.log(`${dirName} 폴더 생성`);

      return true;
    });

    this.setIsDeleteNonContrastFiles(!isSuccess);
  };

  private addRawDirectories = async (): Promise<void> => {
    if (!this.hasDirectory(ORIGINAL_DOCUMENT)) return;

    const isSuccess = this.originalDocumentDirNames.every(dirName => {
      const path = join(this.rootPath, ORIGINAL_DOCUMENT, dirName);
      if (this.hasDirectory(path)) return false;

      mkdirSync(path);
      Logger.log(`${ORIGINAL_DOCUMENT}/${dirName} 폴더 생성`);

      return true;
    });

    this.setIsDeleteNonContrastFiles(!isSuccess);
  };

  private movePictureFiles = async (): Promise<void> => {
    this.originalDocumentDirNames.forEach(dirName => {
      const isJpgDirectory = this.jpgRegExp.test(dirName);
      const extension = isJpgDirectory ? this.jpgRegExp : this.rawRegExp;
      const newPath = join(this.rootPath, ORIGINAL_DOCUMENT, dirName);

      this.moveFiles(newPath, extension);
    });
  };

  private deleteNonContrastFiles = async (): Promise<void> => {
    const originalDocumentFiles = this.getOriginalDocumentFiles();

    if (!originalDocumentFiles) {
      return Logger.error('####################### 삭제할 파일이 없음 #######################');
    }

    const [rawFiles, jpgFiles] = originalDocumentFiles;
    const isJpgUser = jpgFiles.length < rawFiles.length;
    const path = join(this.rootPath, ORIGINAL_DOCUMENT, isJpgUser ? RAW : JPG);

    if (isJpgUser) return this.deleteFiles(path, await this.getFilesToDelete(rawFiles, jpgFiles));
    this.deleteFiles(path, await this.getFilesToDelete(jpgFiles, rawFiles));
  };

  private getFiles = (extension: string | RegExp, path = this.rootPath): string[] => {
    return readdirSync(path)
      .filter(item => statSync(join(path, item)).isFile() && RegExp(extension, 'gi').test(extname(item)))
      .sort();
  };

  private getOriginalDocumentFiles = (): string[][] | null => {
    const [rawFiles, jpgFiles] = this.originalDocumentDirNames.map(dirName => {
      const isJpgDirectory = this.jpgRegExp.test(dirName);
      const extension = isJpgDirectory ? this.jpgRegExp : this.rawRegExp;
      const path = join(this.rootPath, ORIGINAL_DOCUMENT, dirName);

      return this.getFiles(extension, path);
    });

    const isNoDeleteFiles = jpgFiles.length === rawFiles.length;
    const isNotEmptyRawAndJpg = jpgFiles.length && rawFiles.length;
    if (isNoDeleteFiles || !isNotEmptyRawAndJpg) return null;

    return [rawFiles, jpgFiles];
  };

  private getFilesToDelete = async (deleteFiles: string[], compareFiles: string[]): Promise<string[]> => {
    const queryMessage = `${CYAN}\r\n삭제하시겠습니까 ? ${YELLOW}${UNDERSCORE}삭제:1${RESET}  ${GREEN}${UNDERSCORE}취소:2\r\n`;
    const filesToDelete = deleteFiles.filter(deleteFile => {
      return !compareFiles.some(compareFile => this.hasSameFile(deleteFile, compareFile));
    });

    Logger.log(`${filesToDelete.join('\r\n')}`, `\r\n총 개수: ${filesToDelete.length}`);

    return new Promise(resolve => {
      this.readline.question(queryMessage, (line: string) => {
        if (+line === 1) return resolve(filesToDelete);

        this.exitMessage();
        process.exit();
      });
    });
  };

  private hasDirectory = (path: string): boolean => existsSync(path);

  private hasPictureFiles = (...extensions: RegExp[]) => extensions.some(extension => this.getFiles(extension).length);

  private setIsDeleteNonContrastFiles = (flag: boolean): void => {
    this.isDeleteNonContrastFiles = flag;
  };

  private hasSameFile = (compareFile1: string, compareFile2: string): boolean => {
    const regExpFileName = /(.*)(?:\.\w+)/;
    const getFileName = (file: string) => file.match(regExpFileName)?.[1] ?? '';

    return getFileName(compareFile1) === getFileName(compareFile2);
  };

  private deleteFiles = (path: string, files: string[]): void => {
    files.forEach(file => {
      const pathToDelete = join(path, file);

      unlinkSync(pathToDelete);
      console.log(`${YELLOW}${pathToDelete} 삭제 완료`);
    });
  };

  private moveFiles = (path: string, extension: RegExp): void => {
    this.getFiles(extension).forEach(file => {
      const oldPath = join(this.rootPath, file);
      const newPath = join(path, file);

      renameSync(oldPath, newPath);
      console.log(`${YELLOW}${newPath} 이동 완료`);
    });
  };

  private exitMessage = () => {
    const queryMessage = `${GREEN}\r\n############################## 종료 ##############################\r\n`;
    this.readline.question(queryMessage, () => process.exit());
  };
}
