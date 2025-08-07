const { SessionsClient } = require("@google-cloud/dialogflow");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
require("dotenv").config();
const { saveMessageToFirestore } = require("./firebase");

const validateEnv = () => {
  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    (!process.env.DIALOGFLOW_CLIENT_EMAIL ||
      !process.env.DIALOGFLOW_PRIVATE_KEY ||
      !process.env.DIALOGFLOW_PRIVATE_KEY_ID)
  ) {
    throw new Error(
      "Either GOOGLE_APPLICATION_CREDENTIALS or DIALOGFLOW_CLIENT_EMAIL, DIALOGFLOW_PRIVATE_KEY, DIALOGFLOW_PRIVATE_KEY_ID must be set"
    );
  }
  if (!process.env.DIALOGFLOW_PROJECT_ID) {
    throw new Error("DIALOGFLOW_PROJECT_ID environment variable not set");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGO_URI environment variable not set");
  }
};

let credentials;
try {
  validateEnv();
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      "Loading credentials from GOOGLE_APPLICATION_CREDENTIALS:",
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );
    credentials = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    );
  } else {
    console.log("Loading credentials from environment variables");
    credentials = {
      client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
      private_key: process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, "\n"),
      private_key_id: process.env.DIALOGFLOW_PRIVATE_KEY_ID,
    };
  }
  console.log("Credentials loaded successfully:", {
    client_email: credentials.client_email,
    project_id: credentials.project_id,
  });
} catch (error) {
  console.error("Failed to load credentials:", error.message);
  throw error;
}
const projectId = process.env.DIALOGFLOW_PROJECT_ID;
console.log("Dialogflow Project ID:", projectId);

const sessionClient = new SessionsClient({ credentials, projectId });

// Hàm phát hiện intent với retry và DeepSearch
const detectIntent = async (
  text,
  sessionId,
  languageCode = "vi",
  deepSearch = false
) => {
  if (!text || typeof text !== "string")
    throw new Error("Text must be a non-empty string");
  if (!["vi", "en"].includes(languageCode))
    throw new Error("Unsupported language code");

  const uniqueSessionId = sessionId || uuidv4();
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    uniqueSessionId
  );
  // console.log("Session Path:", sessionPath);

  const request = {
    session: sessionPath,
    queryInput: { text: { text, languageCode } },
  };

  const MAX_RETRIES = deepSearch ? 5 : 3;
  let attempt = 1;
  while (attempt <= MAX_RETRIES) {
    try {
      // console.log(`Sending request to Dialogflow (Attempt ${attempt})`);
      // const [response] = await sessionClient.detectIntent(request);
      // console.log(
      //   "Raw Dialogflow response:",
      //   JSON.stringify(response, null, 2)
      // );

      const result = response.queryResult;
      const parameters = result.parameters?.fields
        ? Object.keys(result.parameters.fields).reduce((acc, key) => {
            const value = result.parameters.fields[key];
            acc[key] =
              value.stringValue ||
              value.numberValue ||
              value.boolValue ||
              value.listValue?.values[0]?.stringValue ||
              null;
            return acc;
          }, {})
        : {};

      if (
        deepSearch &&
        result.intent?.displayName === "search_product" &&
        result.intentDetectionConfidence < 0.7
      ) {
        // console.log("Low confidence, initiating DeepSearch...");
        const webResults = await performDeepSearch(text);
        const responseText = `Kết quả từ web: ${webResults.join(", ")}`;
        const deepSearchMessage = {
          _id: uuidv4(),
          conversation: sessionId,
          sender: null,
          content: responseText,
          type: "text",
          isBot: true,
          botName: "ShopeeBot",
          readBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await saveMessageToFirestore(deepSearchMessage);
        return {
          intent: "deep_search",
          response: responseText,
          parameters,
          confidence: 0.9,
        };
      }

      const responseText =
        result.fulfillmentText ||
        "Tôi chưa hiểu câu hỏi của bạn. Bạn có muốn nói chuyện với nhân viên hỗ trợ không...";
      const intentMessage = {
        _id: uuidv4(),
        conversation: sessionId,
        sender: null,
        content: responseText,
        type: "text",
        isBot: true,
        botName: "ShopeeBot",
        readBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await saveMessageToFirestore(intentMessage);

      return {
        intent: result.intent?.displayName || null,
        response: responseText,
        parameters,
        confidence: result.intentDetectionConfidence || 0,
      };
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === MAX_RETRIES) {
        const errorMessage = {
          _id: uuidv4(),
          conversation: sessionId,
          sender: null,
          content: "Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.",
          type: "text",
          isBot: true,
          botName: "ShopeeBot",
          readBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await saveMessageToFirestore(errorMessage);
        throw new Error(`Max retries reached: ${error.message}`);
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
      );
      attempt++;
    }
  }

  return {
    intent: null,
    response: "Tôi chưa hiểu câu hỏi của bạn. Vui lòng thử lại sau.",
    parameters: {},
    confidence: 0,
  };
};
// Giả định hàm DeepSearch (cần tích hợp thực tế)
const performDeepSearch = async (query) => {
  return ["Product A", "Product B"];
};

module.exports = { detectIntent };
