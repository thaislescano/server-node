var http = require('http');
var url = require('url');
var fs = require('fs');
var nodemailer = require('nodemailer');

require('./myModule');

http.createServer(function (req, res) {
    var pedido = tryParseJSON(decodeURIComponent(url.parse(req.url, true).path).substring(1));
    var resposta = {};

    if(!pedido || !pedido.tipo){ res.end(); return;}
    else if(pedido.tipo === "avaliarMonitor"){ //procura o monitor com o pedido.user.id e soma os pontos
        resposta.ok = false;
        resposta.msg = "Monitor não encontrado.";
//TO DO fazer a logica da parte onde o aluno pode ou n avaliar o monitor (talvez essa parte fique no pesquisar e já volta se pode ou n avaliar la)
        if(checker([
            pedido.user, {},
            pedido.user.id, 1,
            pedido.user.pontosDominio, 1,
            pedido.user.pontosEmpatia, 1,
            pedido.user.pontosPontualidade, 1]))
        {
            console.log(pedido);
            responder(res, resposta);
            return;            
        }

        for(var i = 0; i < rudeDB.user.length; i++){
            if(pedido.user.id == rudeDB.user[i].id){
                rudeDB.user[i].pontosDominio = (rudeDB.user[i].pontosDominio ? rudeDB.user[i].pontosDominio : 0) + pedido.user.pontosDominio;
                rudeDB.user[i].pontosEmpatia = (rudeDB.user[i].pontosEmpatia ? rudeDB.user[i].pontosEmpatia : 0) + pedido.user.pontosEmpatia;
                rudeDB.user[i].pontosPontualidade = (rudeDB.user[i].pontosPontualidade ? rudeDB.user[i].pontosPontualidade : 0) + pedido.user.pontosPontualidade;
                resposta.ok = true;
                resposta.msg = "Monitor avaliado com sucesso!";
            }
        }
    }
    else if(pedido.tipo === "criarConta"){//procura para ver se ja n existe uma conta igual e cria se n existir
        resposta.ok = true;
        resposta.msg = "Confirme sua conta no email!";

        if(checker([//validar algumas variaveis recebidas
            pedido.user, {},
            pedido.user.imagemId, 1,
            pedido.user.nomeCompleto, " ",
            pedido.user.email, " ",
            pedido.user.senha, " ",
            pedido.user.curso, " ",
            pedido.user.semestre, 1,
            pedido.user.monitor, true]))
        {
            resposta.ok = false;
            responder(res, resposta);
            return;            
        }

        for(var i = 0; i < rudeDB.user.length; i++){//verificar se já existem alguem com o msm email
            if(pedido.user.email === rudeDB.user[i].email){
                resposta.ok = false;
                resposta.msg = "Esse email já foi cadastrado.";
                break;
            }
        }
        if(resposta.ok){
           /* var index = rudeDB.user.length;
            rudeDB.user[index] = {};
            rudeDB.user[index] = pedido.user;
            rudeDB.user[index].id = index;
            // vai enviar email de confirmação?
            ****-SE-SIM-***** apagar o codigo de cima e deixar esse            */
            var index = rudeDB.userNaoAutenticado.length;
            rudeDB.userNaoAutenticado[index] = {};
            rudeDB.userNaoAutenticado[index].user = pedido.user;
            rudeDB.userNaoAutenticado[index].chave = gerarChave();
            var conteudo = {
                to: "nq3i4fsx@hotmail.com",//pedido.user.email,
                subject: 'MONI: confimarção de email!',
                html: '<h1>Seja bem-vindo ao Moni</h1> <p>Clique no link a baixo para confirmar seu email <br> <a href="http://localhost:8010/' + encodeURIComponent(JSON.stringify({tipo:'confirmacao', chave: rudeDB.userNaoAutenticado[index].chave})) + '">Confirmar Email</a></p>' //pode ser html no lugar de text dai só colocar um '<h1>hello world</h1> da vida
            };
            console.log('http://localhost:8010/' + encodeURIComponent(JSON.stringify({tipo:'confirmacao', chave: rudeDB.userNaoAutenticado[index].chave})));
            sendMail(nodemailer, conteudo);
        }
    }
    else if(pedido.tipo === "editarPerfil"){//edita o perfil das informações alteradas
        resposta.ok = false;
        resposta.msg = "ID não encontrado.";

        if(checker([//validar algumas variaveis recebidas
            pedido.user, {}]))
        {
            resposta.ok = false;
            responder(res, resposta);
            return;            
        }

        for(var i = 0; i < rudeDB.user.length; i++){
            if(pedido.user.id === rudeDB.user[i].id){
                rudeDB.user[i].senha = pedido.senha || rudeDB.user[i].senha;
                rudeDB.user[i].imagemId = pedido.imagemId || rudeDB.user[i].imagemId;
                rudeDB.user[i].nomeCompleto = pedido.nomeCompleto || rudeDB.user[i].nomeCompleto;
                rudeDB.user[i].email = pedido.email || rudeDB.user[i].email;
                rudeDB.user[i].curso = pedido.curso || rudeDB.user[i].curso;
                rudeDB.user[i].semestre = pedido.semestre || rudeDB.user[i].semestre;
                rudeDB.user[i].monitor = pedido.monitor || rudeDB.user[i].monitor;
                rudeDB.user[i].disciplina = pedido.disciplina || rudeDB.user[i].disciplina;
                rudeDB.user[i].diaSemana = pedido.diaSemana || rudeDB.user[i].diaSemana;
                rudeDB.user[i].horario = pedido.horario || rudeDB.user[i].horario;
               
                resposta.msg = "Atualizado com sucesso!";
                resposta.ok = true;
                resposta.user = rudeDB.user[i];
                break;
            }
        }
    }
    else if(pedido.tipo === "login"){//verifica se senha e login existem
        resposta.existe = false;
        if(!pedido.user){
            responder(res, resposta);
            return;
        }
        for(var i = 0; i < rudeDB.user.length; i++){
            if(pedido.user.email === rudeDB.user[i].email && pedido.user.senha === rudeDB.user[i].senha){
                resposta.existe = true;
                resposta.user = JSON.parse(JSON.stringify(rudeDB.user[i]));
                resposta.user.senha = "";
                break;
            }
        }
    }
    else if(pedido.tipo === "pesquisar"){//devolve array com os monitores da disciplina X
        resposta.monitores = [];
        resposta.ok = false;
        if(!pedido.disciplina || isNaN(pedido.semestre)){
            console.log("entrou no primeiro if");
            responder(res, resposta);
            return;
        }
        for(var i = 0; i < rudeDB.user.length; i++){
            if(pedido.disciplina === rudeDB.user[i].disciplina && rudeDB.user[i].monitor && rudeDB.user[i].semestre > pedido.semestre){
                var index = resposta.monitores.length;
                resposta.ok = true;
                resposta.monitores[index] = JSON.parse(JSON.stringify(rudeDB.user[i]));
                resposta.monitores[index].senha = "";
                resposta.monitores[index].avaliavel = false;

                for (var j = 0; j < rudeDB.monitoria.length; j++) {
                    if(rudeDB.user[i].id === rudeDB.monitoria[j].idMonitor && pedido.id === rudeDB.monitoria[j].idAluno)
                        resposta.monitores[index].avaliavel = true;
                }
            }
        }
    }
    else if(pedido.tipo === "registrarMonitoria"){
        var index = rudeDB.monitoria.length;

        rudeDB.monitoria[index] = {};
        rudeDB.monitoria[index] = pedido.monitoria;
        rudeDB.monitoria[index].id = index;
        rudeDB.monitoria[index].idAluno;

        for (var i = rudeDB.user.length - 1; i >= 0; i--) {
            if(rudeDB.user[i].nomeCompleto.toUpperCase() == pedido.monitoria.nomeAluno.toUpperCase())
                rudeDB.monitoria[index].idAluno = rudeDB.user[i].id;
        }

        resposta.ok = true;
    }
    else if(pedido.tipo === "verMonitoria"){
        resposta.length = 0;
        if(!pedido.id){
            responder(res, resposta);
            return;
        }
        for(var i = 0; i < rudeDB.monitoria.length; i++){
            if(pedido.id === rudeDB.monitoria[i].monitorid){
                var index = resposta.length++;
                resposta[index] = rudeDB.monitoria[i];
            }
        }
    }
    else if(pedido.tipo === "enviarEmail"){
        var conteudo = {
            to: pedido.monitoria.emailprof,
            subject: 'MONI: registros de monitoria',
            html: pedido.monitoria.corpo
        };
        sendMail(nodemailer, conteudo);
        resposta.ok = true;
    }
    else if(pedido.tipo === "confirmacao"){
        var h1 = "<h1>Link zuado</h1>";

        for (var i = 0; i < rudeDB.userNaoAutenticado.length; i++) {
            if(pedido.chave === rudeDB.userNaoAutenticado[i].chave){
                var index = rudeDB.user.length;
                rudeDB.user[index] = rudeDB.userNaoAutenticado[i].user;
                rudeDB.user[index].id = index;
                var hold = [];
                for(var j=0; j < rudeDB.userNaoAutenticado.length; j++){
                    if(i === j) continue;
                    hold[hold.length] = rudeDB.userNaoAutenticado[j];
                }
                rudeDB.userNaoAutenticado = hold;
                h1 = "<h1>MONI</h1><h2>Email confirmado com sucesso!</h2>";
                break;
            }
        }
        console.log(h1);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(h1);
        res.end();
        return;
    }
    console.log("\n---------");
    console.log(pedido);
    console.log(resposta);
    responder(res, resposta);
}).listen(8010);

fs.readFile('rudeDB', '', function (err, data) {
    tabelas = JSON.parse(data);

    for (let index = 0; index < tabelas.length; index++) {
        let element = tabelas[index];
        fs.appendFile("tabelas/._"+element, '', function (err){
            if (err) throw err;
            fs.readFile("tabelas/._"+element, '', function (err, data) {
                if (err) throw err;
                let tabela = tryParseJSON(data);
                if(tabela)
                    rudeDB[element] = tabela;
                else{
                    rudeDB[element] = [];
                    fs.writeFile("tabelas/._"+element, '[]', function (err, data) {
                        if (err) throw err;
                    });
                }
            });
        });
    }
});
function start(){
    var tempo = 5000;
    setInterval(function(){
        for (let index = 0; index < tabelas.length; index++) {
            let element = tabelas[index];
            fs.writeFile("tabelas/._"+element, JSON.stringify(rudeDB[element]), function (err){
                if (err) throw err;
            });
        }
    },tempo);
}start();


//criarConta
//http://localhost:8010/%7B%22tipo%22%3A%22criarConta%22%2C%22user%22%3A%7B%22email%22%3A%22tha%40tha.tha%22%2C%22senha%22%3A%22tha%22%7D%7D

//login
//http://localhost:8010/%7B%22tipo%22%3A%22login%22%2C%22user%22%3A%7B%22email%22%3A%22tha%40tha.tha%22%2C%22senha%22%3A%22tha%22%7D%7D




