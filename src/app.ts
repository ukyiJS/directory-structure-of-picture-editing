import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { BRIGHT, CYAN, GREEN, JPG, ORIGINAL_DOCUMENT, RAW, RED, RESET, YELLOW } from './type';

export class App {
  private rootPath: string;
  private dirNames: string[];
  private originalDocumentDirNames: [RAW, JPG];
  private rawRegExp: RegExp;
  private jpgRegExp: RegExp;
  private isRootPictureFiles: boolean;
  private isOriginalDocumentDir: boolean;
  private isDeleteNonContrastFiles: boolean;

  constructor(dirNames: string[]) {
    this.rootPath = process.cwd();
    this.dirNames = [ORIGINAL_DOCUMENT, ...dirNames];
    this.originalDocumentDirNames = [RAW, JPG];
    this.rawRegExp = /crw|cr2|cr3|nef|nrw|pef|dng|raf|srw|orf|srf|sr2|arw|rw2|3fr|dcr|kdc|mrw|rwl|mos|x3f|gpr/;
    this.jpgRegExp = /jpg/;
    this.isRootPictureFiles = this.hasPictureFiles(this.jpgRegExp, this.rawRegExp);
    this.isOriginalDocumentDir = this.hasDirectory(join(this.rootPath, ORIGINAL_DOCUMENT));
    this.isDeleteNonContrastFiles = false;
  }

  public start = async (): Promise<void> => {
    console.info(`${CYAN}${BRIGHT}첫번째 실행: 폴더구조 만들기 및 사진이동 만들기`);
    console.info(`${CYAN}두번째 실행: 첫번째 작업이 완료되면 raw파일과 jpg파일 대조 후 파일 제거\r\n`, RESET);

    if (this.isRootPictureFiles) {
      console.log(`${CYAN}################### 1.폴더구조 만들기 및 사진이동 ###################\r\n`);
    }

    if (!this.isRootPictureFiles && !this.isOriginalDocumentDir) {
      console.log(`${RED}######################## 사진파일이 없음 ########################`);
      return await this.delay(5000);
    }

    await this.addDirectories();
    await this.addRawDirectories();

    if (!this.isRootPictureFiles && this.isDeleteNonContrastFiles) {
      console.log(`${CYAN}########### 2.raw파일과 jpg파일 대조 후 없는 파일 제거 ###########\r\n`);
      await this.deleteNonContrastFiles();
    }

    await this.movePictureFiles();

    console.log(`\r\n${GREEN}############################## 종료 ##############################\r\n`);
    await this.delay(5000);
  };

  private addDirectories = async (): Promise<void> => {
    const isSuccess = this.dirNames.every(dirName => {
      const path = join(this.rootPath, dirName);
      if (this.isOriginalDocumentDir) return false;

      mkdirSync(path);
      console.log(`${GREEN}${dirName} 폴더 생성`);

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
      console.log(`${GREEN}${ORIGINAL_DOCUMENT}/${dirName} 폴더 생성`);

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

    if (!originalDocumentFiles)
      return console.log(`\r\n${RED}####################### 삭제할 파일이 없음 #######################`);

    const [rawFiles, jpgFiles] = originalDocumentFiles;
    const isJpgUser = jpgFiles.length < rawFiles.length;

    const path = this.getOriginalDocumentPath(isJpgUser ? RAW : JPG);
    const [rawFilesToDelete, jpgFilesToDelete] = this.getOriginalDocumentToDelete(originalDocumentFiles);

    if (isJpgUser) return this.deleteFiles(path, rawFilesToDelete);
    this.deleteFiles(path, jpgFilesToDelete);
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

  private getOriginalDocumentPath = (kind: RAW | JPG) => join(this.rootPath, ORIGINAL_DOCUMENT, kind);

  private getOriginalDocumentToDelete = (originalDocumentFiles: string[][]): string[][] => {
    const originalDocumentToDelete = originalDocumentFiles.map((originalDocumentFile, i) => {
      return originalDocumentFile.filter((file, j) => {
        const compareFile = originalDocumentFiles[1 - i][j];
        return !this.hasSameFile(file, compareFile);
      });
    });

    return originalDocumentToDelete;
  };

  private hasDirectory = (path: string): boolean => existsSync(path);

  private hasPictureFiles = (...extensions: RegExp[]) => extensions.some(extension => this.getFiles(extension).length);

  private setIsDeleteNonContrastFiles = (flag: boolean): void => {
    this.isDeleteNonContrastFiles = flag;
  };

  private hasSameFile = (compareFile1: string, compareFile2: string): boolean => {
    const regExpFileName = /(.*)(?:\.\w+)/;
    const [, fileName] = compareFile1.match(regExpFileName) ?? [];

    return !!fileName && new RegExp(fileName).test(compareFile2);
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

  private delay = async (time: number): Promise<void> => new Promise(resolve => setTimeout(resolve, time));
}
