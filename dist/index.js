#!/usr/bin/env node
'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const child_process_1 = require('child_process');
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const inquirer_1 = __importDefault(require('inquirer'));
const packages = [
  'inquirer',
  'eslint@8.41.0',
  'prettier@^3.3.3',
  'husky@^9.1.5',
  'lint-staged@^15.2.9',
  'eslint-plugin-unused-imports@^4.1.3',
  'prettier-plugin-tailwindcss@^0.6.6',
  'eslint-config-prettier@^9.1.0',
];
const getPackageManager = () => {
  const packageManagers = ['npm', 'yarn', 'pnpm'];
  return inquirer_1.default
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
const installDependencies = (packageManager) => {
  return new Promise((resolve, reject) => {
    const installCommands = {
      npm: ['install', '--save-dev', ...packages],
      yarn: ['add', '--dev', ...packages],
      pnpm: ['add', '-D', ...packages],
    };
    const args = installCommands[packageManager];
    if (!args) {
      return reject(
        new Error(`지원하지 않는 패키지 매니저입니다: ${packageManager}`),
      );
    }
    const installProcess = (0, child_process_1.spawn)(packageManager, args, {
      stdio: 'inherit',
    });
    installProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${packageManager}로 의존성 설치에 실패했습니다.`));
      } else {
        resolve();
      }
    });
  });
};
const copyConfigFiles = () => {
  const filesToCopy = [
    '.eslintrc.json',
    '.eslintignore',
    '.prettierrc',
    '.prettierignore',
    '.lintstagedrc.json',
  ];
  filesToCopy.forEach((file) => {
    const srcPath = path_1.default.join(__dirname, '..', 'templates', file);
    const destPath = path_1.default.join(process.cwd(), file);
    try {
      fs_1.default.copyFileSync(srcPath, destPath);
      console.log(`${file} 파일이 복사되었습니다.`);
    } catch (error) {
      console.error(`${file} 파일 복사 중 오류가 발생했습니다:`, error);
    }
  });
};
const setupHusky = (packageManager) => {
  return new Promise((resolve, reject) => {
    const huskyCommands = {
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
      return reject(
        new Error(`지원하지 않는 패키지 매니저입니다: ${packageManager}`),
      );
    }
    const runCommand = (cmdArgs) => {
      return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)(
          packageManager,
          ['exec', ...cmdArgs],
          { stdio: 'inherit' },
        );
        proc.on('close', (code) => {
          if (code !== 0) {
            reject(
              new Error(
                `명령어 실행 실패: ${packageManager} ${cmdArgs.join(' ')}`,
              ),
            );
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
const updatePackageJsonScripts = () => {
  const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
  try {
    const packageJsonData = fs_1.default.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonData);
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    packageJson.scripts.format = 'prettier --write . --cache';
    fs_1.default.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
    );
    console.log('package.json의 scripts 섹션이 업데이트되었습니다.');
  } catch (error) {
    console.error('package.json 업데이트 중 오류가 발생했습니다:', error);
  }
};
const main = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const packageManager = yield getPackageManager();
      yield installDependencies(packageManager);
      copyConfigFiles();
      yield setupHusky(packageManager);
      updatePackageJsonScripts();
      console.log('설정이 완료되었습니다!');
    } catch (error) {
      console.error('오류가 발생했습니다:', error);
      process.exit(1);
    }
  });
main();
