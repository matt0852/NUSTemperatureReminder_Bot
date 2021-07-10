require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')

const schedule = require('node-schedule')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {authSource: 'admin', useNewUrlParser: true, useUnifiedTopology: true}, (err) => {
    if (err) console.log(err)
    else console.log('Connected to mongodb')
})

let userSchema = new mongoose.Schema({
    chatId: Number,
    link: String
})

let userModel = mongoose.model('User', userSchema)

const url = 'https://api.telegram.org/bot' + process.env.TOKEN
const defaultLink = 'https://myaces.nus.edu.sg/htd/htd'

var lastChatId = 0

// db methods

findUser = async (chatId) => {
    userModel.findOne({chatId: chatId}).then((user) => {
        return user
    })
}

createNewUser = async (chatId) => {
    let existingUser = await findUser(chatId)
    if (existingUser == null) {
        console.log('New user')
        let user = new userModel({
            chatId: chatId,
            link: defaultLink
        })
        await user.save()
    }
    else {
        console.log('User already in database')
    }
}

// message methods

getTextMessage = (req) => {
    if (req.body.message.text && req.body.message.chat.id) {
        let message = {
            text: req.body.message.text,
            chatId: req.body.message.chat.id
        }
        return message
    }
    else return null
}

sendMessage = async (chatId, text) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: chatId,
            text: text
        }
    })
}

sendWelcomeMessage = async (chatId) => {
    let text = 'Hi! This is the NUS Temperature Reminder Bot. Your link will be sent at 8am and 1pm daily.'
    await sendMessage(chatId, text)
}

sendReminderMessage = async (chatId) => {
    let text = 'Remember to take your temperature! ' + defaultLink
    await sendMessage(chatId, text)
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        if (message.text == '/start') {
            await createNewUser(message.chatId)
            await sendWelcomeMessage(message.chatId)
        }
    }
    lastChatId = message.chatId
    res.sendStatus(200)
}

// scheduler methods

const job = schedule.scheduleJob('0 8 * * *', () => {
    sendReminderMessage(lastChatId)
}) 

const secondJob = schedule.scheduleJob('0 13 * * *', () => {
    sendReminderMessage(lastChatId)
}) 

// express routes

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot. Find it at http://t.me/NUSTemperatureReminder_Bot')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    manageMessage(req, res)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})