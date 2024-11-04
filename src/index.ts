#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

const packages: string[] = [
  'inquirer',
  'eslint@8.41.0',
  'prettier@^3.3.3',
  'husky@^9.1.5',
  'lint-staged@^15.2.9',
  'eslint-plugin-unused-imports@^4.1.3',
  'prettier-plugin-tailwindcss@^0.6.6',
  'eslint-config-prettier@^9.1.0',
];

const getPackageManager = (): Promise<string> => {
  const packageManagers = ['npm', 'yarn', 'pnpm'];
  return inquirer
    .prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: '사용할 패키지 매니저를 선택하세요:',
        choices: packageManagers,
      },
    ])
    .then((answers) => answers.packageManager);
};

const installDependencies = (packageManager: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const installCommands: { [key: string]: string[] } = {
      npm: ['install', '--save-dev', ...packages],
      yarn: ['add', '--dev', ...packages],
      pnpm: ['add', '-D', ...packages],
    };

    const args = installCommands[packageManager];
    if (!args) {
      return reject(new Error(`지원하지 않는 패키지 매니저입니다: ${packageManager}`));
    }

    const installProcess = spawn(packageManager, args, { stdio: 'inherit' });

    installProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${packageManager}로 의존성 설치에 실패했습니다.`));
      } else {
        resolve();
      }
    });
  });
};

const copyConfigFiles = (): void => {
  const filesToCopy: string[] = [
    '.eslintrc.json',
    '.eslintignore',
    '.prettierrc',
    '.prettierignore',
    '.lintstagedrc.json',
  ];

  filesToCopy.forEach((file: string) => {
    const srcPath: string = path.join(__dirname, '..', 'templates', file);
    const destPath: string = path.join(process.cwd(), file);

    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`${file} 파일이 복사되었습니다.`);
    } catch (error) {
      console.error(`${file} 파일 복사 중 오류가 발생했습니다:`, error);
    }
  });
};

const setupHusky = (packageManager: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const huskyCommands: { [key: string]: string[][] } = {
      npm: [
        ['husky', 'init'],
        ['echo', '"npx lint-staged"', '> .husky/pre-commit'],
      ],
      yarn: [
        ['husky', 'init'],
        ['echo', '"yarn lint-staged"', '> .husky/pre-commit'],
      ],
      pnpm: [
        ['husky', 'init'],
        ['echo', '"pnpm exec lint-staged"', '> .husky/pre-commit'],
      ],
    };

    const commands = huskyCommands[packageManager];
    if (!commands) {
      return reject(new Error(`지원하지 않는 패키지 매니저입니다: ${packageManager}`));
    }

    const runCommand = (cmdArgs: string[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        const proc = spawn(packageManager, ['exec', ...cmdArgs], { stdio: 'inherit' });
        proc.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`명령어 실행 실패: ${packageManager} ${cmdArgs.join(' ')}`));
          } else {
            resolve();
          }
        });
      });
    };

    commands
      .reduce((prevPromise, cmdArgs) => {
        return prevPromise.then(() => runCommand(cmdArgs));
      }, Promise.resolve())
      .then(resolve)
      .catch(reject);
  });
};

const main = async (): Promise<void> => {
  try {
    const packageManager = await getPackageManager();
    await installDependencies(packageManager);
    copyConfigFiles();
    await setupHusky(packageManager);
    console.log('설정이 완료되었습니다!');
  } catch (error) {
    console.error('오류가 발생했습니다:', error);
    process.exit(1);
  }
};

main();
