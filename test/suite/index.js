const path = require("path");
const Mocha = require("mocha");
const glob = require("glob");

function run() {
  const mocha = new Mocha({
    ui: "tdd",
    color: true
  });

  const testsRoot = path.resolve(__dirname);

  return new Promise((resolve, reject) => {
    glob("**/*.test.js", { cwd: testsRoot }, (err, files) => {
      if (err) {
        return reject(err);
      }

      files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

      try {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            if (process.env.RIGGER_TEST_HOLD === "1") {
              console.log("Rigger: holding VS Code open. Close the window to exit.");
              return;
            }
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports = { run };
