import React from "react";
import "../css/ProductDetailInfo.css";

const ReviewForm = ({
  productId,
  setProductId,
  userId,
  setUserId,
  content,
  setContent,
  name,
  setName,
  phone,
  setPhone,
  agreePolicy,
  setAgreePolicy,
  agreeRecommend,
  setAgreeRecommend,
  images,
  handleFileChange,
  removeImage,
}) => {
  return (
    <div className="inputrating__group">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Product ID:
        </label>
        <input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Nhập Product ID"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          User ID:
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Nhập User ID"
          required
        />
      </div>
      <textarea
        className="fRContent"
        name="fRContent"
        placeholder="Mời bạn chia sẻ thêm cảm nhận..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      ></textarea>
      <div className="txtcount__box">
        <span className="ct" style={{ display: "none" }}>
          0 chữ
        </span>
      </div>
      <div className="form-column">
        <div className="upload__box">
          <div className="upload__btn-box">
            <label className="upload__btn">
              <a href="#" className="send-img">
                <p>
                  Gửi ảnh thực tế <span>(tối đa 3 ảnh)</span>
                </p>
              </a>
              <input
                id="hdFileRatingUploadv2"
                name="hdfRatingImg"
                type="file"
                multiple
                accept="image/x-png, image/gif, image/jpeg"
                data-max_length="3"
                className="upload__inputfile hide"
                onChange={handleFileChange}
              />
              <input
                type="hidden"
                name="hdfRatingImg"
                id="hdfRatingImg"
                className="hdfRatingImg"
                value=""
              />
              <input type="hidden" name="hdUrl" />
            </label>
          </div>
          <div className="upload__img-wrap hide">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="agree">
          <input
            type="checkbox"
            name="agreeRecommend"
            id="checkbox_introduce"
            checked={agreeRecommend}
            onChange={(e) => setAgreeRecommend(e.target.checked)}
          />
          <p>Tôi sẽ giới thiệu sản phẩm cho bạn bè, người thân</p>
        </div>
      </div>
      <div className="item">
        <input
          type="text"
          className="fRName"
          name="fRName"
          placeholder="Họ tên (bắt buộc)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          className="fRPhone"
          onKeyPress={(e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
          }}
          name="fRPhone"
          placeholder="Số điện thoại (bắt buộc)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input type="hidden" name="hdfProductID" value="259283" />
        <input name="submit" type="hidden" />
        <div className="agree custom-cursor-on-hover" id="agree-policy-rating">
          <input
            type="checkbox"
            name="agreePolicy"
            id="checkbox_policy"
            checked={agreePolicy}
            onChange={(e) => setAgreePolicy(e.target.checked)}
            required
          />
          <p>
            Tôi đồng ý với{" "}
            <a href="/chinh-sach-xu-ly-du-lieu-ca-nhan" target="_blank">
              Chính sách xử lý dữ liệu cá nhân
            </a>{" "}
            của Shop
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm;
