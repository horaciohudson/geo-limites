const HELP_BASE_URL = 'https://ajuda.geolimites.com.br/'

const routeHelpMap: Record<string, string> = {
  '/login': '02-primeiros-passos/primeiro-acesso-e-login/',
  '/register': '02-primeiros-passos/primeiro-acesso-e-login/',
  '/verify-email': '02-primeiros-passos/primeiro-acesso-e-login/',
  '/resend-verification': '02-primeiros-passos/primeiro-acesso-e-login/',
  '/properties': '03-fluxo-operacional/imoveis-e-arquivos-tecnicos/',
  '/files': '03-fluxo-operacional/imoveis-e-arquivos-tecnicos/',
  '/viewer': '04-memorial/visualizador-normas-e-geracao/',
  '/standards': '04-memorial/visualizador-normas-e-geracao/',
  '/memorial': '04-memorial/visualizador-normas-e-geracao/',
  '/manage-standards': '05-modelos-e-normas/modelos-documentais-e-normas/',
  '/configure-templates': '05-modelos-e-normas/modelos-documentais-e-normas/',
  '/upload-example': '05-modelos-e-normas/modelos-documentais-e-normas/',
  '/my-account': '06-conta/conta-creditos-e-seguranca/',
  '/financial': '06-conta/conta-creditos-e-seguranca/',
  '/admin': '07-administracao/empresa-smtp-e-usuarios/',
}

export const getHelpUrlForPath = (pathname: string): string => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const helpPath = routeHelpMap[normalizedPath]
  return helpPath ? `${HELP_BASE_URL}${helpPath}` : HELP_BASE_URL
}

export const openHelpPage = (pathname: string): void => {
  const helpUrl = getHelpUrlForPath(pathname)
  const opened = window.open(helpUrl, '_blank', 'noopener,noreferrer')
  if (!opened) {
    const shouldOpenHere = window.confirm(
      'O navegador bloqueou a nova aba. Deseja abrir a ajuda nesta aba?'
    )
    if (shouldOpenHere) {
      window.location.assign(helpUrl)
    }
  }
}

