import React from "react";

const ResponseMessage = ({ response }) => {
  if (!response) return null;

  return (
    <div
      className={`mt-4 p-3 rounded-md ${
        response.type === "success"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {response.message}
    </div>
  );
};

export default ResponseMessage;
