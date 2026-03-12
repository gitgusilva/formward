export default {
  querySelector (el: Element | null) {
    global.document.querySelector = () => el || null;
  },
  binding () {
    return {
      modifiers: {} as Record<string, boolean>,
      expression: 'exp',
      value: 'someval'
    };
  },
  vnode (shouldThrow?: boolean, result?: boolean, callback?: () => void) {
    return {
      context: {
        $validator: this.validator(shouldThrow, result, callback),
        $nextTick: (cb: () => void) => {
          cb();
        }
      },
      data: {
        directives: [] as unknown[]
      }
    };
  },
  validator (shouldThrow = true, result = false, callback?: () => void) {
    return {
      validate (_name: string, value: unknown) {
        if (shouldThrow) {
          throw (String(value));
        }
        return new Promise<boolean>((resolve, reject) => {
          if (shouldThrow) {
            reject(String(value));
            return;
          }
          resolve(result);
        }).then((something) => {
          if (typeof callback === 'function') callback();
          return something;
        });
      },
      attach () {}
    };
  },
  file: (name: string, type: string, size = 1) =>
    new File([new ArrayBuffer(size * 1024)], name, { type }),
  fileList: (files: File[]) =>
    Object.assign(
      { length: files.length, item: (index: number) => files[index] },
      files
    )
};
