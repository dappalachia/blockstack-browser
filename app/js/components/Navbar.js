import React, { Component, PropTypes } from 'react'
import { Link } from 'react-router'

const icons = {
  homeNav: '/images/icon-nav-home.svg',
  homeNavActive: '/images/icon-nav-home-hover.svg',
  walletNav: '/images/icon-nav-wallet.svg',
  walletNavActive: '/images/icon-nav-wallet-hover.svg',
  avatarNav: '/images/icon-nav-avatar.svg',
  avatarNavActive: '/images/icon-nav-avatar-hover.svg',
  settingsNav: '/images/icon-nav-settings.svg',
  settingsNavActive: '/images/icon-nav-settings-hover.svg'
}

class Navbar extends Component {
  static propTypes = {
    activeTab: PropTypes.string
  }

  constructor(props) {
    super(props)
    this.onHomeNavMouseOver = this.onHomeNavMouseOver.bind(this)
    this.onHomeNavMouseOut = this.onHomeNavMouseOut.bind(this)
    this.onWalletNavMouseOver = this.onWalletNavMouseOver.bind(this)
    this.onWalletNavMouseOut = this.onWalletNavMouseOut.bind(this)
    this.onAvatarNavMouseOver = this.onAvatarNavMouseOver.bind(this)
    this.onAvatarNavMouseOut = this.onAvatarNavMouseOut.bind(this)
    this.onSettingsNavMouseOver = this.onSettingsNavMouseOver.bind(this)
    this.onSettingsNavMouseOut = this.onSettingsNavMouseOut.bind(this)

    this.state = {
      homeTabHover: false,
      walletTabHover: false,
      avatarTabHover: false,
      settingsTabHover: false
    }
  }

  onHomeNavMouseOver() {
    this.setState({ homeTabHover: true })
  }

  onHomeNavMouseOut() {
    this.setState({ homeTabHover: false })
  }

  onWalletNavMouseOver() {
    this.setState({ walletTabHover: true })
  }

  onWalletNavMouseOut() {
    this.setState({ walletTabHover: false })
  }

  onAvatarNavMouseOver() {
    this.setState({ avatarTabHover: true })
  }

  onAvatarNavMouseOut() {
    this.setState({ avatarTabHover: false })
  }

  onSettingsNavMouseOver() {
    this.setState({ settingsTabHover: true })
  }

  onSettingsNavMouseOut() {
    this.setState({ settingsTabHover: false })
  }


  settingsNavIconImage() {
    if (this.props.activeTab === 'settings'
      || this.state.settingsTabHover) {
      return icons.settingsNavActive
    } else {
      return icons.settingsNav
    }
  }

  homeNavIconImage() {
    if (this.props.activeTab === 'home'
      || this.state.homeTabHover) {
      return icons.homeNavActive
    } else {
      return icons.homeNav
    }
  }

  walletNavIconImage() {
    if (this.props.activeTab === 'wallet'
      || this.state.walletTabHover) {
      return icons.walletNavActive
    } else {
      return icons.walletNav
    }
  }

  avatarNavIconImage() {
    if (this.props.activeTab === 'avatar'
      || this.state.avatarTabHover) {
      return icons.avatarNavActive
    } else {
      return icons.avatarNav
    }
  }

  render() {
    return (
      <header className="container-fluid no-padding">
        <nav className="navbar navbar-expand container-fluid">
          <ul className="navbar-nav container-fluid">
            <li className="nav-item">
              <Link
                to="/" className="nav-link"
                onMouseOver={this.onHomeNavMouseOver}
                onMouseOut={this.onHomeNavMouseOut}
              >
                <img src={this.homeNavIconImage()} alt="Home" />
                <span>Home</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/profiles"
                className="nav-link"
                onMouseOver={this.onAvatarNavMouseOver}
                onMouseOut={this.onAvatarNavMouseOut}
              >
                <img src={this.avatarNavIconImage()} alt="IDs" />
                <span>Profile</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/wallet/receive" className="nav-link"
                onMouseOver={this.onWalletNavMouseOver}
                onMouseOut={this.onWalletNavMouseOut}
              >
                <img src={this.walletNavIconImage()} alt="Wallet" />
                <span>Wallet</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/account" className="nav-link"
                onMouseOver={this.onSettingsNavMouseOver}
                onMouseOut={this.onSettingsNavMouseOut}
              >
                <img src={this.settingsNavIconImage()} alt="Settings" />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
      </header>
    )
  }
}

export default Navbar
