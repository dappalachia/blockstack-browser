import React from 'react'
import PropTypes from 'prop-types'
import { decrypt, isBackupPhraseValid } from '@utils'
import { browserHistory, withRouter } from 'react-router'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { AccountActions } from '../account/store/account'
import { IdentityActions } from '../profiles/store/identity'
import { SettingsActions } from '../account/store/settings'
import { connectToGaiaHub } from '../account/utils/blockstack-inc'
import { RegistrationActions } from '../profiles/store/registration'
import { BLOCKSTACK_INC } from '../account/utils/index'
import { setCoreStorageConfig } from '@utils/api-utils'
import { Initial, Password, Success } from './views'
import log4js from 'log4js'
import { ShellParent, AppHomeWrapper } from '@blockstack/ui'
import {
  selectConnectedStorageAtLeastOnce,
  selectEmail,
  selectEncryptedBackupPhrase,
  selectIdentityAddresses,
  selectIdentityKeypairs,
  selectPromptedForEmail
} from '@common/store/selectors/account'
import {
  selectLocalIdentities,
  selectRegistration,
  selectDefaultIdentity
} from '@common/store/selectors/profiles'
import {
  selectApi,
  selectStorageConnected
} from '@common/store/selectors/settings'
import {
  selectAppManifest,
  selectAuthRequest
} from '@common/store/selectors/auth'
import { formatAppManifest } from '@common'
import App from '../App'
const CREATE_ACCOUNT_IN_PROCESS = 'createAccount/in_process'

const logger = log4js.getLogger('sign-in/index.js')

const VIEWS = {
  INITIAL: 0,
  PASSWORD: 1,
  SUCCESS: 2
}

const views = [Initial, Password, Success]

function mapStateToProps(state) {
  return {
    updateApi: PropTypes.func.isRequired,
    api: selectApi(state),
    appManifest: selectAppManifest(state),
    authRequest: selectAuthRequest(state),
    promptedForEmail: selectPromptedForEmail(state),
    encryptedBackupPhrase: selectEncryptedBackupPhrase(state),
    localIdentities: selectLocalIdentities(state),
    identityAddresses: selectIdentityAddresses(state),
    identityKeypairs: selectIdentityKeypairs(state),
    connectedStorageAtLeastOnce: selectConnectedStorageAtLeastOnce(state),
    storageConnected: selectStorageConnected(state),
    email: selectEmail(state),
    registration: selectRegistration(state),
    defaultIdentityIndex: selectDefaultIdentity(state)
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    Object.assign(
      {},
      AccountActions,
      SettingsActions,
      IdentityActions,
      RegistrationActions
    ),
    dispatch
  )
}

class SignIn extends React.Component {
  state = {
    password: '',
    key: '',
    encryptedKey:
      this.props.location &&
      this.props.location.query &&
      this.props.location.query.seed
        ? this.props.location.query.seed
        : null,
    decrypt: false,
    decrypting: false,
    decryptedKey: null,
    loading: false,
    restoreError: '',
    view: VIEWS.INITIAL
  }

  componentWillMount() {
    if (this.props.encryptedBackupPhrase) {
      this.props.router.push('/')
    }
    const { location } = this.props
    if (location.query.seed) {
      this.setState({ encryptedKey: location.query.seed })
    }
  }

  updateValue = (key, value) => {
    this.setState({ [key]: value })
  }

  updateView = view => this.setState({ view })

  backToSignUp = () => browserHistory.push({ pathname: '/sign-up' })

  isKeyEncrypted = key => !(key.split(' ').length === 12 || key.split(' ').length === 24)

  validateRecoveryKey = key => {
    if (this.state.key !== key) {
      this.setState({ key })
    }
    if (this.isKeyEncrypted(key)) {
      this.setState(
        {
          encryptedKey: key,
          decrypt: true
        },
        () => setTimeout(() => this.updateView(VIEWS.PASSWORD), 100)
      )
    } else {
      this.setState(
        {
          seed: key,
          decrypt: false
        },
        () => setTimeout(() => this.updateView(VIEWS.PASSWORD), 100)
      )
    }
  }

  decryptKeyAndRestore = () => {
    if (!this.state.password) {
      console.error('no password in state')
    }
    if (this.state.decrypt) {
      if (!this.state.decrypting) {
        return this.setState(
          { decrypting: true },
          () =>
            setTimeout(() =>
              decrypt(
                new Buffer(this.state.encryptedKey, 'base64'),
                this.state.password
              )
                .then(decryptedKeyBuffer => {
                  const decryptedKey = decryptedKeyBuffer.toString()
                  this.setState(
                    {
                      key: decryptedKey,
                      decrypting: false,
                      loading: true,
                      restoreError: null
                    },
                    () => setTimeout(() => this.restoreAccount(), 100)
                  )
                })
                .catch(() => {
                  this.setState({
                    decrypting: false,
                    restoreError: 'Incorrect code or password',
                    key: ''
                  })
                })
            ),
          100
        )
      }
    }
    return this.setState(
      {
        loading: true,
        restoreError: null
      },
      () => setTimeout(() => this.restoreAccount(), 100)
    )
  }

  restoreAccount = () =>
    setTimeout(
      () =>
        this.createAccount()
          .then(() => this.updateView(VIEWS.SUCCESS))
          .catch(() => {
            this.setState({
              loading: false,
              restoreError: 'There was an error loading your account.'
            })
          }),
      150
    )

  updateView = view => this.setState({ view })
  backView = (view = this.state.view) => {
    if (view - 1 >= 0) {
      return this.setState({
        view: view - 1
      })
    } else {
      return null
    }
  }

  /**
   * initialize our wallet
   * this will initialize our wallet and then create an account for us
   * see account/actions.js
   */
  async initializeWallet() {
    const { password, key } = this.state
    const { initializeWallet } = this.props
    return initializeWallet(password, key)
  }

  /**
   * Create ID and Set it as default
   * this function needs to fire after the initializeWallet function has finished
   * it will generate a new ID with address and set it as the default ID
   */
  async createNewIdAndSetDefault() {
    const {
      identityAddresses,
      createNewIdentityWithOwnerAddress,
      setDefaultIdentity
    } = this.props
    const firstIdentityIndex = 0
    logger.debug('creating new identity')
    const ownerAddress = identityAddresses[firstIdentityIndex]
    logger.debug('ownerAddress', ownerAddress)
    createNewIdentityWithOwnerAddress(firstIdentityIndex, ownerAddress)
    logger.debug('settingAsDefault')
    setDefaultIdentity(firstIdentityIndex)
  }

  /**
   * Connect Storage
   */
  async connectStorage() {
    logger.debug('fire connectStorage')
    const storageProvider = this.props.api.gaiaHubUrl
    const signer = this.props.identityKeypairs[0].key
    return connectToGaiaHub(storageProvider, signer).then(gaiaHubConfig => {
      const newApi = Object.assign({}, this.props.api, {
        gaiaHubConfig,
        hostedDataLocation: BLOCKSTACK_INC
      })
      this.props.updateApi(newApi)
      const identityIndex = 0
      const identity = this.props.localIdentities[identityIndex]
      const identityAddress = identity.ownerAddress
      const profileSigningKeypair = this.props.identityKeypairs[identityIndex]
      const profile = identity.profile
      setCoreStorageConfig(
        newApi,
        identityIndex,
        identityAddress,
        profile,
        profileSigningKeypair,
        identity
      )
      logger.debug('connectStorage: storage initialized')
      const newApi2 = Object.assign({}, newApi, { storageConnected: true })
      this.props.updateApi(newApi2)
      this.props.storageIsConnected()
      logger.debug('connectStorage: storage configured')
      logger.debug('connectStorage has finished')
    })
  }

  /**
   * This is our main function for creating a new account
   */
  createAccount = async () => {
    const { key } = this.state
    logger.debug('creating account, createAccount()')

    const { isValid } = isBackupPhraseValid(key)

    if (!isValid) {
      logger.error('restoreAccount: Invalid keychain phrase entered')
      return Promise.reject('Invalid keychain phrase entered')
    }
    this.setState({
      creatingAccountStatus: CREATE_ACCOUNT_IN_PROCESS
    })
    // Initialize our wallet
    return this.initializeWallet().then(() =>
      // Create new ID and owner address and then set to default
      this.createNewIdAndSetDefault().then(() =>
        // Connect our default storage
        this.connectStorage().then(() => console.log('complete'))
      )
    )
  }

  /**
   * Redirect to Auth Request
   */
  redirectToAuth = () => {
    this.props.router.push(`/auth/?authRequest=${this.props.authRequest}`)
  }

  goToBackup = () => {
    browserHistory.push({
      pathname: '/seed',
      state: { seed: this.state.key, password: this.state.password }
    })
  }

  successNext = () => {
    if (this.props.appManifest && this.props.authRequest) {
      this.redirectToAuth()
    } else {
      this.props.router.push('/')
    }
  }

  render() {
    const { view } = this.state
    const user = this.props.localIdentities.length
      ? this.props.localIdentities[0]
      : {}
    const viewProps = [
      {
        show: VIEWS.INITIAL,
        props: {
          previous: this.backToSignUp,
          next: this.validateRecoveryKey,
          updateValue: this.updateValue
        }
      },
      {
        show: VIEWS.PASSWORD,
        props: {
          previous: () => this.updateView(VIEWS.INITIAL),
          next: this.decryptKeyAndRestore,
          updateValue: this.updateValue
        }
      },
      {
        show: VIEWS.SUCCESS,
        props: {
          id: user.ownerAddress,
          username: user.username ? user.username : '?',
          next: () => this.successNext(),
          goToRecovery: () => this.goToBackup()
        }
      }
    ]

    const currentViewProps = viewProps.find(v => v.show === view) || {}

    const componentProps = {
      view,
      backView: () => this.backView(),
      decrypt: this.state.decrypt,
      loading: this.state.loading,
      decrypting: this.state.decrypting,
      password: this.state.password,
      error: this.state.restoreError,
      key: this.state.key || this.state.decryptedKey,
      ...currentViewProps.props
    }
    return (
      <App>
        <ShellParent
          app={formatAppManifest(this.props.appManifest)}
          views={views}
          {...componentProps}
          headerLabel="Sign into Blockstack"
          lastHeaderLabel="Welcome Back"
          invertOnLast
        />
        <AppHomeWrapper />
      </App>
    )
  }
}

SignIn.propTypes = {
  api: PropTypes.object.isRequired,
  location: PropTypes.object,
  appManifest: PropTypes.object,
  authRequest: PropTypes.string,
  router: PropTypes.object,
  identityAddresses: PropTypes.array,
  createNewIdentityWithOwnerAddress: PropTypes.func.isRequired,
  setDefaultIdentity: PropTypes.func.isRequired,
  initializeWallet: PropTypes.func.isRequired,
  updateApi: PropTypes.func.isRequired,
  localIdentities: PropTypes.array.isRequired,
  identityKeypairs: PropTypes.array.isRequired,
  storageIsConnected: PropTypes.func.isRequired,
  encryptedBackupPhrase: PropTypes.string
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(SignIn))
