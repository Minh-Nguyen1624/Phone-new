import React from "react";

const QuickFilter = ({
  selectedFilter,
  onFilterByCategory,
  setShowSubCategories,
  category,
}) => {
  return (
    <div className="quickfilter" style={{ marginBottom: "20px" }}>
      <a
        href="#"
        className={`quickfilter_desktop-computer ${
          selectedFilter === "máy tính để bàn" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Máy tính để bàn");
          onFilterByCategory("máy tính để bàn");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdn.tgdd.vn/Category//5698/maytinhbo-80x80.png"
          alt="Máy tính để bàn"
        />
        <span>Máy tính để bàn</span>
      </a>
      <a
        href="#"
        className={`quickfilter_monitor ${
          selectedFilter === "màn hình máy tính" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Màn hình máy tính");
          onFilterByCategory("màn hình máy tính");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdn.tgdd.vn/Category//5697/manhinh-80x80.png"
          alt="Màn hình máy tính"
        />
        <span>Màn hình máy tính</span>
      </a>
      <a
        href="#"
        className={`screen-mount ${
          selectedFilter === "giá treo màn hình" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Giá treo màn hình");
          onFilterByCategory("giá treo màn hình");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdnv2.tgdd.vn/mwg-static/common/Category/13658/ce/a9/cea921f5cca4595d35187759eaa0d002.png"
          alt="Giá treo màn hình"
        />
        <span>Giá treo màn hình</span>
      </a>
      <a
        href="#"
        className={`printer ${
          selectedFilter === "máy in" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Máy in");
          onFilterByCategory("máy in");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdn.tgdd.vn/Category//5693/Mayin2x-80x80-9.png"
          alt="Máy in"
        />
        <span>Máy in</span>
      </a>
      <a
        href="#"
        className={`printing-ink ${
          selectedFilter === "mực in" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Mực in");
          onFilterByCategory("mực in");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdn.tgdd.vn/Category//1262/Mucin2x-80x80.png"
          alt="mực in"
        />
        <span>Mực in</span>
      </a>
      <a
        href="#"
        className={`printing-paper ${
          selectedFilter === "giấy in" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Giấy in");
          onFilterByCategory("giấy in");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdnv2.tgdd.vn/mwg-static/common/Category/13258/ff/56/ff56d2bf090010c035c631d6acce0d83.jpg"
          alt="giấy in"
        />
        <span>Giấy in</span>
      </a>
      <a
        href="#"
        className={`handheld-gaming-device ${
          selectedFilter === "máy chơi game cầm tay" ? "selected-filter" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          console.log("Clicked category: Máy chơi game cầm tay");
          onFilterByCategory("máy chơi game cầm tay");
          setShowSubCategories(true);
        }}
      >
        <img
          src="https://cdn.tgdd.vn/Category//12918/logo-may-choi-game-80x80-80x80-1.jpg"
          alt="máy chơi game cầm tay"
        />
        <span>Máy chơi game cần tay</span>
      </a>
    </div>
  );
};

export default QuickFilter;
