; Tauri NSIS 安装钩子。
;
; 卸载后清掉安装器记录的“上次安装目录”（HKCU\Software\zhiyue\Zhiyue 默认值）。
; 官方模板只在勾选“删除应用数据”时才删这个值，普通卸载会留给下次安装当默认目录，
; 于是测试或临时安装用过的路径会长期出现在目录页里。更新安装（/UPDATE）依赖它
; 装回原位置，所以只在非更新卸载时清除。

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegValue SHCTX "${MANUPRODUCTKEY}" ""
    DeleteRegKey /ifempty SHCTX "${MANUPRODUCTKEY}"
    DeleteRegKey /ifempty SHCTX "${MANUKEY}"
  ${EndIf}
!macroend
