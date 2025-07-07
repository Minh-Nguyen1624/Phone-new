const sortObject = (obj) => {
    let sorted = {};
    let keys = Object.keys(obj).sort();
    keys.forEach((key) => {
        sorted[key] = obj[key];
    });
    return sorted;
};

module.exports = {
    sortObject,
};