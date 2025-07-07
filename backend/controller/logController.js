const Log = require("../model/logModel");
const User = require("../model/userModel");

// Tạo log mới
const createdLog = async (req, res) => {
  try {
    const {
      level,
      message,
      metadata,
      source,
      actor,
      environment,
      errorCode,
      stackTrace,
      category,
    } = req.body;

    const newLog = new Log({
      level,
      message,
      metadata,
      source,
      actor,
      environment,
      errorCode,
      stackTrace,
      category,
    });
    await newLog.save();
    res.status(201).json({
      success: true,
      message: "Log created successfully",
      data: newLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating log",
      error: error.message,
    });
  }
};

const getAllLogs = async (req, res) => {
  try {
    const logs = await Log.find()
      .populate("actor", "username email role")
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      message: "Logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving logs",
      error: error.message,
    });
  }
};

const getLogById = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id).populate(
      "actor",
      "username email role"
    );
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Log retrieved successfully",
      data: log,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving log by ID",
      error: error.message,
    });
  }
};

const updateLogById = async (req, res) => {
  try {
    const {
      level,
      message,
      metadata,
      resolved,
      errorCode,
      stackTrace,
      category,
    } = req.body;

    const updatedLog = await Log.findByIdAndUpdate(
      req.params.id,
      { level, message, metadata, resolved, errorCode, stackTrace, category },
      { new: true }
    );

    if (!updatedLog) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Log updated successfully",
      data: updatedLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating log",
      error: error.message,
    });
  }
};

const deleteBlogById = async (req, res) => {
  try {
    const logs = await Log.findByIdAndDelete(req.params.id);
    if (!logs) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Log deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting log",
      error: error.message,
    });
  }
};

// Lọc logs theo các tham số (ví dụ: level, source, environment)
const filterLogs = async (req, res) => {
  try {
    const { level, source, environment, startDate, endDate } = req.query;

    // Tạo đối tượng query để tìm kiếm logs
    const query = {};

    if (level) query.level = level;
    if (source) query.source = source;
    if (environment) query.environment = environment;
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const logs = await Log.find(query).sort({ timestamp: -1 }); // Lọc theo thời gian giảm dần

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error filtering logs",
      error: error.message,
    });
  }
};

const exportLogs = async (req, res) => {
  try {
    const logs = await Log.find();
    const csv = logs
      .map((log) => {
        return `${log.level},${log.message},${log.timestamp},${log.source},${log.environment}`;
      })
      .join("\n");
    res.header("Content-Type", "text/csv");
    res.attachment("logs.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error exporting logs",
      error: error.message,
    });
  }
};

const getPaginatedLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.params;
    const logs = Log.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const totalLogs = await Log.countDocuments();
    res.status(200).json({
      success: true,
      message: "Logs retrieved successfully",
      data: {
        // logs: await logs,
        totalLogs,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving paginated logs",
      error: error.message,
    });
  }
};

const markLogAsResolved = async (req, res) => {
  try {
    const logs = await Log.findById(req.params.id);

    if (!logs) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    logs.resolved = true;
    await logs.save();

    res.status(200).json({
      success: true,
      message: "Log marked as resolved successfully",
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking log as resolved",
      error: error.message,
    });
  }
};

const aggregateLogs = async (req, res) => {
  try {
    const logs = await Log.aggregate([
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json({
      success: true,
      message: "Logs aggregated successfully",
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error aggregating logs",
      error: error.message,
    });
  }
};

const searchLogs = async (req, res) => {
  try {
    const { keywords } = req.params;
    const logs = await Log.find({
      $or: [
        { message: { $regex: keyword, $options: "i" } },
        { actor: { $regex: keyword, $options: "i" } },
        { metadata: { $regex: keyword, $options: "i" } },
      ],
    });
    res.status(200).json({
      success: true,
      message: "Logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching logs",
      error: error.message,
    });
  }
};

const deleteLogsByDate = async (req, res) => {
  try {
    const { date } = req.body;
    const result = await Log.deleteMany({
      timestamp: {
        $lt: new Date(date),
      },
    });
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} logs deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting logs by date",
      error: error.message,
    });
  }
};

module.exports = {
  createdLog, // Tạo log mới
  getAllLogs, // Lấy tất cả logs
  getLogById, // Lấy log theo id
  updateLogById, // Cập nhật log
  deleteBlogById, // Xóa log
  filterLogs, // Lọc logs
  exportLogs, // Xuất logs ra file csv
  deleteLogsByDate, // Xóa logs theo ngày
  getPaginatedLogs, // Lấy logs theo trang
  markLogAsResolved, // Đánh dấu log đã giải quyết
  aggregateLogs, // Tổng hợp logs
  searchLogs, // Tìm kiếm logs
};
