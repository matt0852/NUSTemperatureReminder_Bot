require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')

const schedule = require('node-schedule')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_CONNECTION_STRING,
    { authSource: 'admin', useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false },
    (err) => {
        if (err) console.log(err)
        else console.log('Connected to mongodb')
    })

let userSchema = new mongoose.Schema({
    chatId: Number,
    link: String,
    changeLinksMode: Boolean
})

let userModel = mongoose.model('User', userSchema)

const url = 'https://api.telegram.org/bot' + process.env.TOKEN
const defaultLink = 'https://myaces.nus.edu.sg/htd/htd'

// db methods

findUser = async (chatId) => {
    let user = await userModel.findOne({ chatId: chatId })
    return user
}

createNewUser = async (chatId) => {
    let user = new userModel({
        chatId: chatId,
        link: defaultLink,
        changeLinksMode: false
    })
    await user.save()
}

updateChangeLinksMode = async (chatId, changeLinksMode) => {
    let user = await userModel.findOneAndUpdate({ chatId: chatId }, { changeLinksMode: changeLinksMode }, { new: true })
    return user
}

changeLinks = async (message) => {
    let user = findUser(message.chatId)
    console.log(user)
    console.log(message.text)
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

sendReminderMessage = async () => {
    let users = await userModel.find()
    for (const user of users) {
        let text = 'Remember to take your temperature! \n' + user.link
        await sendMessage(user.chatId, text)
    }
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        // find the user who sent the message, if any
        let user = await findUser(message.chatId)

        // if the user exists, check if the user is currently changing the links
        if (user) {
            console.log('Existing user')
            if (user.changeLinksMode == true) {
                console.log('Changing links')
                await updateChangeLinksMode(message.chatId, false)
                await changeLinks(message)
                await sendMessage(message.chatId, 'Link(s) have been updated')
            }
        }

        // otherwise, make a new user
        else {
            console.log('New user')
            await createNewUser(message.chatId)
        }

        // user commands
        if (message.text == '/start') {
            await sendMessage(message.chatId, 'Hi! This is the NUS Temperature Reminder Bot. Your link will be sent at 8am and 1pm daily.')
        }

        else if (message.text = '/change') {
            updateChangeLinksMode(message.chatId, true)
            await sendMessage(message.chatId, 'Please enter your new link(s):')
        }

        // admin commands
        else if (message.text = '/matt0852_test') {
            await sendReminderMessage()
        }
    }
    res.sendStatus(200)
}

// scheduler methods

const job = schedule.scheduleJob('0 8 * * *', () => {
    sendReminderMessage()
})

const secondJob = schedule.scheduleJob('0 13 * * *', () => {
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