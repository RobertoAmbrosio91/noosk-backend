const { ObjectId } = require("mongodb");
const ChatModel = require("../model/chat.model");
const util = require("../../../utils/response");
const mongoose = require("mongoose");
const SubcategoryModel = require("../../master/model/subcategory.model");
const userModel = require("../../user/model/user.model");
const FirebaseTokenModel = require("../../user/model/firebase_token.model");
const NotificationModel = require("../../user/model/notification.model");
const pushNotification = require("../../../utils/push-notification");
const MessageReportModel = require("../model/message_report.model");

let io;
class ChatHandler {
  setIO(socketIOInstance) {
    io = socketIOInstance;
  }

  async sendMessage(req, res) {
    try {
      let messageData = {
        sender: new mongoose.Types.ObjectId(req.body.sender),
        chat_room: new mongoose.Types.ObjectId(req.body.chat_room),
        content: req.body.content,
      };

      const message = await ChatModel.createMessage(messageData);
      io.to(message.chat_room.toString()).emit("new_message", message);

      let subCat = await SubcategoryModel.getOne({
        _id: new ObjectId(req.body.subcategory),
        is_deleted: false,
      });

      let getSubCatUsers = await userModel.getByKeys({
        subcategory_id: new ObjectId(req.body.subcategory),
        _id: { $nin: [new ObjectId(req.user._id)] },
        is_deleted: false,
      });
      console.log("Category", req.body.subcategory);
      console.log("Total users", getSubCatUsers.length);
      if (getSubCatUsers && getSubCatUsers.length > 0) {
        for (let su of getSubCatUsers) {
          let tokens = await FirebaseTokenModel.findByKey({
            user_id: su._id,
            is_deleted: false,
          });

          if (tokens && tokens.length > 0) {
            let notificationData = {
              tokens: tokens.map((rs) => rs.token),
              title: `New message in ${subCat.name}`,
              body: `Dear ${su.first_name} ${
                su.middle_name ? su.middle_name + " " : ""
              }${su.last_name}, Other users are discussing in ${
                subCat.name
              }. Keep the knowledge-sharing spirit alive by adding your content. Tap to Share Now.`,
              data: {
                type: "Chat Message",
                chat_id: req.body.chat_room,
              },
            };

            let sendRs = await pushNotification.sendMulticast(notificationData);

            if (
              sendRs &&
              sendRs.results &&
              sendRs.successCount &&
              sendRs.successCount > 0
            ) {
              let insObject = [];

              insObject.push({
                user_id: req.user._id,
                receiver_id: su._id,
                title: notificationData.title,
                message: notificationData.body,
                data_message: notificationData.data,
                is_read: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              let addNotification =
                await NotificationModel.createManyNotifications(insObject);
            }
          }

          /* if(su && su.email){
            await mailer.sendmailUsingOptions({
              to:su.email,
              subject:`New post is created in ${subCat.name}`,
              html:`Dear ${su.first_name} ${su.middle_name ? su.middle_name+' ' : ''}${su.last_name}, Other users are sharing knowledge in ${subCat.name}. Keep the knowledge-sharing spirit alive by adding your content. Tap to Share Now.`
            });
          } */
        }
      }

      return res.status(200).json(util.success(message));
    } catch (error) {
      res.status(500).json(util.error({}, error));
    }
  }

  async deleteMessage(req, res) {
    try {
      // const messageId = req.params.messageId;
      const messageIds = req.body.messageIds;
      const message = await ChatModel.findMessageById(messageIds[0]);
      const roomId = message.chat_room._id;

      const result = await ChatModel.deleteMessage(messageIds);

      io.to(roomId.toString()).emit("message_deleted", {
        messageIds: messageIds,
      });
      return res.status(200).json(util.success(result, "Message deleted"));
    } catch (error) {
      return res.status(400).json(util.error({}, error));
    }
  }

  async deleteAllChatMessages(req, res) {
    try {
      const roomId = new ObjectId(req.params.roomId);
      const result = await ChatModel.deleteAllChatMessages(roomId);
      return res.status(200).json(util.success(result, "All messages deleted"));
    } catch (error) {
      return res.status(400).json(util.error({}, error));
    }
  }

  async createChatRoom(req, res) {
    try {
      let roomData = {};
      if (!req.body.name || typeof req.body.name !== "string") {
        return res.status(400).json({ message: "Invalid room name" });
      }
      let subcategory = new ObjectId(req.body.subcategory);
      let related_fields_ids = [];
      if (req.body.related_fields && Array.isArray(req.body.related_fields)) {
        related_fields_ids = req.body.related_fields.map(
          (fieldId) => new ObjectId(fieldId)
        );
      }

      if (related_fields_ids.length === 0) {
        roomData = {
          created_by: new ObjectId(req.user._id),
          name: req.body.name.trim(),
          subcategory: subcategory,
        };
      } else {
        roomData = {
          created_by: new ObjectId(req.user._id),
          name: req.body.name.trim(),
          subcategory: subcategory,
          related_fields: related_fields_ids,
        };
      }
      const room = await ChatModel.createChatRoom(roomData);
      return res
        .status(200)
        .json(util.success(room, "Room Created Successfully"));
    } catch (error) {
      console.log(error);
      return res.status(400).json(util.error({}, error));
    }
  }

  async getChatRoomById(req, res) {
    try {
      const roomId = req.params.roomId;
      const room = await ChatModel.getChatRoomById(roomId);
      console.log(roomId);
      res
        .status(200)
        .json(util.success(room, "Chat room fetched successfully"));
    } catch (error) {
      res.status(400).json(util.error({}, error));
    }
  }
  async getChatRoomBySubcategory(req, res) {
    try {
      const subcategory_ids = req.body.subcategory_ids;
      const chatRooms = await ChatModel.getChatRoomsBySubcategory(
        subcategory_ids
      );

      res
        .status(200)
        .json(util.success(chatRooms, "Chat room fetched successfully"));
    } catch (error) {
      res.status(400).json(util.error({}, error));
    }
  }

  async getAllChatRooms(req, res) {
    try {
      const rooms = await ChatModel.getAllChatRooms();
      res
        .status(200)
        .json(util.success(rooms, "Chat room fetched successfully"));
    } catch (error) {
      res.status(400).json(util.error({}, error));
    }
  } 

  async deleteChatRoom(req, res) {
    try {
      const roomId = new ObjectId(req.params.roomId);
      const deleteChat = await ChatModel.deleteChatRoom(roomId);
      if (deleteChat) {
        let deleteMessages = await ChatModel.deleteAllChatMessages(roomId);
        return res
          .status(200)
          .json(util.success(deleteMessages, "Chat room and messages deleted"));
      }
    } catch (error) {
      return res.status(400).json(util.error({}, error));
    }
  }

  async updateChatRoom(req, res) {
    try {
      const roomId = req.body._id;

      let updateData = {};
      if (req.body.name) {
        updateData.name = req.body.name;
      }
      if (req.body.participant) {
        const participantId = new ObjectId(req.body.participant);
        updateData.$addToSet = { participants: participantId };
      }

      const updatedRoom = await ChatModel.updateChatRoom(roomId, updateData);
      res
        .status(200)
        .json(util.success(updatedRoom, "Chat room updated successfully"));
    } catch (error) {
      res.status(400).json(util.error({}, error));
    }
  }

  async reportMessage(req, response) {
    try {
      if (
        typeof req.body.message_id == "undefined" ||
        (req.body.message_id && !ObjectId.isValid(req.body.message_id))
      ) {
        return response.status(400).json(util.error({}, "message_id is empty"));
      } else if (
        typeof req.body.report_reason == "undefined" ||
        req.body.report_reason.trim() == ""
      ) {
        return response
          .status(400)
          .json(util.error({}, "report_reason  is empty"));
      } else {
        const checkWhere = {
          reported_by: new ObjectId(req.user._id),
          message_id: new ObjectId(req.body.message_id),
        };
        let check = await MessageReportModel.countReport(checkWhere);
        if (check > 0) {
          return response
            .status(200)
            .json(util.error({}, "This message has already been reported"));
        } else {
          const insObj = {
            reported_by: new ObjectId(req.user._id),
            message_id: new ObjectId(req.body.message_id),
            report_reason: req.body.report_reason,
          };
          const result = await MessageReportModel.createReport(insObj);
          return response
            .status(200)
            .json(util.success(result, "Message reported successfully"));
        }
      }
    } catch (error) {
      return response
        .status(400)
        .json(
          util.error(
            {},
            error.message || "Something went wrong reporting the message"
          )
        );
    }
  }

  // connectToChatRoom(roomId) {
  //   io.join(roomId);
  // }

  // disconnectFromChatRoom(roomId) {
  //   io.leave(roomId);
  // }
}

module.exports = new ChatHandler();
