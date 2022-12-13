const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const createUserToken = require('../helpers/create-user-token')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')

module.exports = class UserController {
  static async register(req, res) {
    const { name, email, phone, password, confirmpassword } = req.body
    if (!name) {
      res.status(422).json({ message: 'campo nome é obrigatório' })
      return
    }

    if (!email) {
      res.status(422).json({ message: 'campo email obrigatório' })
      return
    }

    if (!phone) {
      res.status(422).json({ message: 'campo telefone é obrigatório' })
      return
    }

    if (!password) {
      res.status(422).json({ message: 'A senha é obrigatório' })
      return
    }

    if (!confirmpassword) {
      res.status(422).json({ message: 'campo confirma senha é obrigatório' })
      return
    }
    if (password !== confirmpassword) {
      res.status(422).json({ message: 'A senha precisam ser iguais!' })
      return
    }
    const userExists = await User.findOne({ email: email })
    if (userExists) {
      res.status(422).json({ message: 'Email já cadastrado!' })
      return
    }
    const salt = await bcrypt.genSalt(15)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = new User({
      name,
      email,
      phone,
      password: passwordHash
    })
    try {
      const newUser = await user.save()
      await createUserToken(newUser, req, res)
    } catch (error) {
      res.status(500).json({ message: error })
    }
  }
  static async login(req, res) {
    const { email, password } = req.body
    if (!email) {
      res.status(422).json({ messagem: ' O email é obrigatório!' })
      return
    }
    if (!password) {
      res.status(422).json({ message: 'A senha é obrigatória!' })
      return
    }

    const user = await User.findOne({ email: email })
    if (!user) {
      res
        .status(422)
        .json({ message: 'Não há usúario cadastrado com esse e-mail!' })
      return
    }
    const checkPassword = await bcrypt.compare(password, user.password)

    if (!checkPassword) {
      res.status(422).json({ message: 'Senha inválida!' })
      return
    }

    await createUserToken(user, req, res)
  }
  static async checkUser(req, res) {
    let currentUser
    console.log(req.headers.authorization)
    if (req.headers.authorization) {
      const token = getToken(req)
      const decoded = jwt.verify(token, 'nossosecret')

      currentUser = await User.findById(decoded.id)
      currentUser.password = undefined
    } else {
      currentUser = null
    }
    res.status(200).send(currentUser)
  }
  static async getUserById(req, res) {
    const id = req.params.id
    const user = await User.findById(id).select('-password')
    if (!user) {
      res.status(200).json({
        message: 'Usuário não encontrado!'
      })
      return
    }
    res.status(200).json({ user })
  }
  static async editUser(req, res) {
    const id = req.params.id

    const token = getToken(req)
    const user = await getUserByToken(token)

    const { name, email, phone, password, confirmpassword } = req.body
    let image = ''

    if (req.file) {
      user.image = req.file.filename
    }

    // validação.

    if (!name) {
      res.status(422).json({ message: 'campo nome é obrigatório' })
      return
    }

    user.name = name

    if (!email) {
      res.status(422).json({ message: 'campo email obrigatório' })
      return
    }
    const userExists = await User.findOne({ email: email })

    if (user.email !== email && userExists) {
      res.status(422).json({
        message: 'Email já cadastrado!'
      })
      return
    }
    user.email = email

    if (!phone) {
      res.status(422).json({ message: 'campo telefone é obrigatório' })
      return
    }
    user.phone = phone

    if (password != confirmpassword) {
      res.status(422).json({ message: 'As Senhas não conferem!' })
      return
    } else if (password === confirmpassword && password != null) {
      const salt = await bcrypt.genSalt(15)
      const passwordHash = await bcrypt.hash(password, salt)

      user.password = passwordHash
    }
    try {
      await User.findByIdAndUpdate(
        { _id: user._id },
        { $set: user },
        { new: true }
      )
      res.status(200).json({ message: 'Usuário atualizado com sucesso!' })
    } catch (err) {
      res.status(500).json({ message: err })
      return
    }
  }
}
