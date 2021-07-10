require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')

const schedule = require('node-schedule')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { authSource: 'admin', useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
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
    let user = await userModel.findOne({ chatId: chatId })
    return user
}

createNewUser = async (chatId) => {
    let existingUser = await findUser(chatId)
    if (existingUser) {
        console.log('User already in database')
    }
    else {
        console.log('New user')
        let user = new userModel({
            chatId: chatId,
            link: defaultLink
        })
        await user.save()
    }
}

// message methods

getTextMessage = (req) => {
    try {
        if (req.body.message.text && req.body.message.chat.id) {
            let message = {
                text: req.body.message.text,
                chatId: req.body.message.chat.id
            }
            return message
        }
        else return null
    }
    catch {
        return null
    }
}

sendMessage = async (chatId, text) => {
    let res = await axios.get(url + '/sendMessage', {
        params: {
            chat_id: chatId,
            text: text
        }
    })
    console.log(res.status)
    return res.status
}

sendWelcomeMessage = async (chatId) => {
    let text = 'Hi! This is the NUS Temperature Reminder Bot. Your link will be sent at 8am and 1pm daily.'
    await sendMessage(chatId, text)
}

sendReminderMessage = async () => {
    let text = 'Remember to take your temperature! ' + defaultLink
    let users = await userModel.find()
    console.log(users)
    for (var user in users) {
        await sendMessage(user.chatId, text)
    }
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        if (message.text == '/start') {
            await createNewUser(message.chatId)
            await sendWelcomeMessage(message.chatId)
        }
        lastChatId = message.chatId
    }
    res.sendStatus(200)
}

// scheduler methods

const job = schedule.scheduleJob('0 8 * * *', () => {
    sendReminderMessage()
})

const secondJob = schedule.scheduleJob('59 10 * * *', () => {
    sendReminderMessage()
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