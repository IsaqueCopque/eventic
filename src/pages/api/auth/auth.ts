import bcrypt from 'bcrypt'
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authOptions } from './[...nextauth]';
import { getServerSession , Session } from 'next-auth';
import { UsuarioRepo } from '@app/server/database';


/*
*  Faz o hash de senha
*/
const salt = await bcrypt.genSalt(10);
export function hashPassword(password: string) : Promise<string>{
    return bcrypt.hash(password, salt);
}

/*
*  Checa senha
*/
export async function checkPassword(password : string, dbPassword : string) : Promise<boolean>{
    return await bcrypt.compare(password,dbPassword);
}

/*
* Função que verifica se usuário possui autorização para acessar um recurso
*/
export async function redirectIfNotAuthorized(req :any, res:any, role: Permissao){
    let session = await getServerSession(req,res,authOptions);

        if(!session){
            return({
                props:{},
                redirect:{
                    destination: `${process.env.NEXT_PUBLIC_URL}/auth/login?error=NotLogged"`,
                    permanet:false,
                }
            })
        }

        session = await getCustomSession(session);
        if(role !== session.user.permissao){
            return(
                {
                    props:{},
                    redirect: {
                    destination: `${process.env.NEXT_PUBLIC_URL}/auth/login?error=Forbidden`,
                    permanent: false,
                    }
                }
            )
        }

        return({
            props:{}
        })
       
}

export async function getCustomSession(session: Session):Promise<Session>{
    const user = await UsuarioRepo.findOne({ where: { email: session.user.email.toLocaleLowerCase() } });
    if (user) {
      const { primeiroNome, segundoNome, permissao, fotoPerfil } = user;
      session.user = { ...session.user, primeiroNome, segundoNome, permissao, fotoPerfil }
    }
    return session
}

    // const token = await getToken({req});

    // if(!token)
    //     return NextResponse.redirect(new URL('/auth/login'));
    
    // if(token?.permissao == roleRequired)
    //     return true;

    // return NextResponse.redirect(new URL('/accessdenied'));