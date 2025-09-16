import React, { Component } from "react";
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Ghi log chi tiết lỗi
    console.error("Error caught by ErrorBoundary:", {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(), // Thêm thời gian để theo dõi
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "red", padding: "20px" }}>
          Đã xảy ra {this.state.error.message}
          <br>Vui lòng kiểm tra lỗi liên quan</br>
        </div>
      );
    }
  }
}

export default ErrorBoundary;
