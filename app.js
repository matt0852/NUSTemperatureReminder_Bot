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
    timings: [String],
    changeLinksMode: Boolean,
    changeTimingsMode: Boolean
})

let userModel = mongoose.model('User', userSchema)

const bot = '@NUSTemperatureReminder_Bot'
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
        timings: ['0800', '1300'],
        changeLinksMode: false,
        changeTimingsMode: false
    })
    await user.save()
}

updateChangeLinksMode = async (chatId, changeLinksMode) => {
    let user = await userModel.findOneAndUpdate({ chatId: chatId }, { changeLinksMode: changeLinksMode }, { new: true })
    return user
}

changeUserLinks = async (message) => {
    let user = await userModel.findOneAndUpdate({ chatId: message.chatId }, { link: message.text }, { new: true })
    return user
}

updateChangeTimingsMode = async (chatId, changeTimingsMode) => {
    let user = await userModel.findOneAndUpdate({ chatId: chatId }, { changeTimingsMode: changeTimingsMode }, { new: true })
    return user
}

changeTimings = async (message) => {
    let timings = message.text.split(',')
    console.log(timings)
    for (let time in timings) {
        console.log(time)
        if (time.length != 4) {
            console.log('Not 4')
            return
        }
        if (Number(time) == NaN) {
            console.log('Not number')
            return
        }
    }
    let user = await userModel.findOneAndUpdate({ chatId: message.chatId }, { timings: timings }, { new: true })
    return user
}

deleteUser = async (chatId) => {
    await userModel.findOneAndDelete({ chatId: chatId })
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
    return res.status
}

sendTestMessage = async (chatId) => {
    let user = await findUser(chatId)
    let text = 'Remember to take your temperature! \n' + user.link
    await sendMessage(user.chatId, text)
}

sendReminderMessage = async () => {
    let users = await userModel.find()
    for (const user of users) {
        try {
            let text = 'Remember to take your temperature! \n' + user.link
            let res = await sendMessage(user.chatId, text)
            console.log('Reminder sent to: ' + user.chatId)
        }
        catch {
            await deleteUser(user.chatId)
            console.log('User deleted: ' + user.chatId)
        }
    }
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        // find the user who sent the message, if any
        let user = await findUser(message.chatId)

        // if the user exists, check if the user is currently changing the links
        if (user) {
            if (user.changeLinksMode == true) {
                await updateChangeLinksMode(message.chatId, false)
                await changeUserLinks(message)
                await sendMessage(message.chatId, 'Your link(s) have been updated.')
            }
            if (user.changeTimingsMode == true) {
                await updateChangeTimingsMode(message.chatId, false)
                let user = await changeTimings(message)
                if (user) await sendMessage(message.chatId, 'Your timings have been updated.')
                else await sendMessage(message.chatId, 'Error - wrong formatting. Try again with /timing.')
            }
        }

        // otherwise, make a new user
        else {
            await createNewUser(message.chatId)
        }

        // user commands
        if (message.text == '/start' || message.text == '/start' + bot) {
            await sendMessage(message.chatId, 'Hi there! This is the NUS Temperature Reminder Bot.\
            \nYour temperature taking link(s) will be sent at 8am and 1pm daily.\
            \n\
            \nUse /change to change the links that the bot will send.\
            \nUse /test to send a sample reminder message.\
            \nUse /bug to report any bugs.\
            \nUse /github to view the source code.\
            \n\
            \nTo view this message again, use /start')
        }

        else if (message.text == '/change' || message.text == '/change' + bot) {
            await updateChangeLinksMode(message.chatId, true)
            await sendMessage(message.chatId, 'Please send your new link(s):')
        }

        else if (message.text == '/test' || message.text == '/test' + bot) {
            await sendTestMessage(message.chatId)
        }

        else if (message.text == '/timing' || message.text == '/timing' + bot) {
            await updateChangeTimingsMode(message.chatId, true)
            await sendMessage(message.chatId, 'Please send two new timings in the format HHMM,HHMM\nFor instance, 0800,1300')
        }

        else if (message.text == '/github' || message.text == '/github' + bot) {
            await sendMessage(message.chatId, 'Check out the source code here: \
            https://github.com/matt0852/NUSTemperatureReminder_Bot')
        }

        else if (message.text == '/bug' || message.text == '/bug' + bot) {
            await sendMessage(message.chatId, 'Report a bug to my Telegram handle: @matt0852')
        }

        // admin commands

        else if (message.text == '/' + process.env.ADMIN + '_test') {
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