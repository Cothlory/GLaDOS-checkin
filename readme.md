# Checkin

[GLaDOS][glados] 签到使用本机浏览器。GitHub Actions 保留手动运行入口。

([GLaDOS][glados] 可用邀请码: `MW4DK-O0RSF-C7AOU-EN1MP`, 双方都有奖励天数)

## 本机签到

1. 在常用浏览器打开 [GLaDOS 签到页][checkin]，登录后点击签到。如果页面要求 Cloudflare 验证，在该页面完成验证。
2. 如有多个账号，可在 Chrome 或 Edge 中为每个账号使用独立的浏览器个人资料，分别登录并签到。
3. 本机签到使用浏览器保存的登录会话，无需在 GitHub 配置 Cookie 或 User-Agent。

### Windows 定时打开签到页

在「任务计划程序」中创建基本任务，将触发器设为每天、操作设为「启动程序」。

- 程序或脚本填 `powershell.exe`。
- 添加参数填 `-NoProfile -WindowStyle Hidden -Command "Start-Process 'https://glados.cloud/console/checkin'"`。
- 在任务属性中选择「只在用户登录时运行」，然后右键任务选择「运行」，确认默认浏览器打开了签到页。

定时任务只负责打开页面。请在页面上完成签到，并确认显示签到成功或今日已签到。

## GitHub Actions 手动排障

工作流仅接受手动运行。维护分支在 Cloudflare 验证上线后停用了 Actions 定时签到，参见[上游变更][upstream].

1. 如需测试 Actions 的接口登录，从同一浏览器会话配置 `GLADOS` 和 `GLADOS_UA`。Cookie 需包含 `gld:sess` 和 `gld:sess.sig`。多账号按相同顺序逐行配置。

1. 在 **Actions → Auto Sign → Run workflow** 手动运行。若日志提示需要 Cloudflare 验证，请打开 [GLaDOS 签到页][checkin]。

1. 如需推送通知, 可配置 Secret `NOTIFY`, 已支持:
    1. [WxPusher][wxpusher]: 格式 `wxpusher:{token}:{uid}`
    1. [PushPlus][pushplus]: 格式 `pushplus:{token}`
    1. [Bark][bark]: 格式 `bark:{key}`
    1. [企业微信][qyweixin]: 格式 `qyweixin:{key}`
    1. Console: 格式 `console:log`, 作为日志输出, 一般用于调试
    1. 如需配置多个, 可以写为多行, 每行写一个

1. 注意: Cookie 以及接口输出数据, 包含帐号敏感信息, 因此不要随意公开

---

[glados]: https://github.com/glados-network/GLaDOS
[checkin]: https://glados.cloud/console/checkin
[upstream]: https://github.com/badarch47/glados_checkin/commit/dfe981861494a96eb011f704858fba0c75f86993
[pushplus]: https://www.pushplus.plus/
[wxpusher]: https://wxpusher.zjiecode.com/
[bark]: https://github.com/Finb/Bark
[qyweixin]: https://developer.work.weixin.qq.com/document/path/91770
