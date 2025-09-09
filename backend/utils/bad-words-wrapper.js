// // utils/bad-words-wrapper.js
// module.exports = new Promise((resolve, reject) => {
//   import("bad-words")
//     .then((module) => {
//       // module.default chính là class BadWordsFilter
//       resolve(module.default); // Trả về class, không phải instance
//     })
//     .catch((err) => {
//       console.error("Failed to load bad-words:", err);
//       reject(err);
//     });
// });
// utils/bad-words-wrapper.js
module.exports = import("bad-words").then((mod) => {
  const BadWordsFilter = mod.Filter; // <-- dùng Filter thay vì default
  return BadWordsFilter;
});
